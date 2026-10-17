-- Per-brunch setting: when require_items is on, an attending RSVP needs at least one
-- item. Declined, waiting and legacy no-status payloads (derived to declined without
-- items) are unaffected. Additive: defaults to false, same signatures.

alter table public.brunches add column require_items boolean not null default false;

-- b.* is expanded when a view is created, so the view is rebuilt to expose the column.
drop view public.brunches_with_status;
create view public.brunches_with_status
with (security_invoker = true)
as
select
  b.*,
  case
    when b.invites_sent_at is null then 'draft'
    when b.responses_close_at is not null and b.responses_close_at <= now() then 'closed'
    else 'open'
  end as status
from public.brunches b;

create or replace function public.save_response(
  p_brunch_id uuid,
  p_payload jsonb,
  p_response_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brunch public.brunches;
  v_menu_id uuid;
  v_votes_open boolean;
  v_response_id uuid := p_response_id;
  v_item jsonb;
  v_response_item_id uuid;
  v_requested public.response_status := (p_payload ->> 'status')::public.response_status;
  v_declined boolean := coalesce(v_requested = 'declined', false);
begin
  select * into v_brunch from public.brunches where id = p_brunch_id;
  if not found or v_brunch.invites_sent_at is null then
    raise exception 'brunch not found';
  end if;

  if v_brunch.responses_close_at is not null and v_brunch.responses_close_at <= now() then
    raise exception 'responses are closed';
  end if;

  v_menu_id := v_brunch.menu_id;
  -- Once the host picks a winning slot (starts_at), the poll is frozen: new
  -- date votes are ignored and existing ones are kept as they were.
  v_votes_open := v_brunch.scheduling = 'poll' and v_brunch.starts_at is null;

  if v_response_id is null then
    if v_brunch.invite_only then
      raise exception 'this brunch is invite only';
    end if;

    insert into public.responses (brunch_id, guest_name, notes, responded_at)
    values (p_brunch_id, p_payload ->> 'guest_name', p_payload ->> 'notes', now())
    returning id into v_response_id;
  else
    update public.responses
    set guest_name = p_payload ->> 'guest_name',
        notes = p_payload ->> 'notes',
        responded_at = coalesce(responded_at, now()),
        updated_at = now()
    where id = v_response_id and brunch_id = p_brunch_id;

    if not found then
      raise exception 'response not found';
    end if;

    -- Replace semantics: wipe the old picks (and votes, if the poll is still
    -- open), then re-insert below.
    delete from public.response_items where response_id = v_response_id;
    if v_votes_open then
      delete from public.response_date_votes where response_id = v_response_id;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(
    case when v_declined then '[]'::jsonb else coalesce(p_payload -> 'items', '[]') end
  ) loop
    insert into public.response_items (response_id, item_id, quantity)
    values (
      v_response_id,
      (v_item ->> 'item_id')::uuid,
      coalesce((v_item ->> 'quantity')::int, 1)
    )
    returning id into v_response_item_id;

    insert into public.response_item_choices (response_item_id, option_choice_id)
    select v_response_item_id, c::uuid
    from jsonb_array_elements_text(coalesce(v_item -> 'option_choice_ids', '[]')) c;

    insert into public.response_item_addons (response_item_id, addon_id)
    select v_response_item_id, a::uuid
    from jsonb_array_elements_text(coalesce(v_item -> 'addon_ids', '[]')) a;
  end loop;

  insert into public.response_date_votes (response_id, date_option_id, availability)
  select
    v_response_id,
    (v ->> 'date_option_id')::uuid,
    (v ->> 'availability')::public.date_availability
  from jsonb_array_elements(coalesce(p_payload -> 'date_votes', '[]')) v
  where v_votes_open and not v_declined;

  -- Validation. Raising rolls back everything above.

  if exists (
    select 1
    from public.response_items ri
    join public.items i on i.id = ri.item_id
    where ri.response_id = v_response_id and i.menu_id <> v_menu_id
  ) then
    raise exception 'item is not on this brunch''s menu';
  end if;

  if exists (
    select 1
    from public.response_item_choices ric
    join public.response_items ri on ri.id = ric.response_item_id
    join public.option_choices oc on oc.id = ric.option_choice_id
    join public.option_groups og on og.id = oc.option_group_id
    where ri.response_id = v_response_id and og.item_id <> ri.item_id
  ) then
    raise exception 'option choice does not belong to the item';
  end if;

  if exists (
    select 1
    from public.response_item_choices ric
    join public.response_items ri on ri.id = ric.response_item_id
    join public.option_choices oc on oc.id = ric.option_choice_id
    where ri.response_id = v_response_id
    group by ri.id, oc.option_group_id
    having count(*) > 1
  ) then
    raise exception 'only one choice allowed per option group';
  end if;

  if exists (
    select 1
    from public.response_items ri
    join public.option_groups og on og.item_id = ri.item_id and og.required
    where ri.response_id = v_response_id
      and not exists (
        select 1
        from public.response_item_choices ric
        join public.option_choices oc on oc.id = ric.option_choice_id
        where ric.response_item_id = ri.id and oc.option_group_id = og.id
      )
  ) then
    raise exception 'a required option group has no choice';
  end if;

  if exists (
    select 1
    from public.response_item_addons ria
    join public.response_items ri on ri.id = ria.response_item_id
    join public.addons a on a.id = ria.addon_id
    where ri.response_id = v_response_id and a.item_id <> ri.item_id
  ) then
    raise exception 'add-on does not belong to the item';
  end if;

  if exists (
    select 1
    from public.response_date_votes dv
    join public.brunch_date_options o on o.id = dv.date_option_id
    where dv.response_id = v_response_id and o.brunch_id <> p_brunch_id
  ) then
    raise exception 'date option does not belong to this brunch';
  end if;

  if v_brunch.require_items
    and coalesce(v_requested = 'attending', false)
    and not exists (select 1 from public.response_items where response_id = v_response_id)
  then
    raise exception 'choose at least one item';
  end if;

  update public.responses
  set status = case
    when v_declined then 'declined'::public.response_status
    when v_requested = 'attending' then 'attending'::public.response_status
    when exists (select 1 from public.response_items where response_id = v_response_id)
      then 'attending'::public.response_status
    else 'declined'::public.response_status
  end
  where id = v_response_id;

  return v_response_id;
end;
$$;


create or replace function public.get_invite(p_brunch_id uuid, p_response_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_invite jsonb := public.get_invite_unchecked(p_brunch_id);
begin
  if v_invite is null or not (v_invite ->> 'invite_only')::boolean then
    return v_invite || jsonb_build_object(
      'require_items',
      (select b.require_items from public.brunches b where b.id = p_brunch_id)
    );
  end if;

  if public.can_read_brunch(p_brunch_id) or exists (
    select 1 from public.responses
    where id = p_response_id and brunch_id = p_brunch_id
  ) then
    return v_invite || jsonb_build_object(
      'require_items',
      (select b.require_items from public.brunches b where b.id = p_brunch_id)
    );
  end if;

  return jsonb_build_object('id', p_brunch_id, 'invite_only', true, 'locked', true);
end;
$$;
