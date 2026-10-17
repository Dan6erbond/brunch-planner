-- Guest RSVPs. No login: the response id is the guest's secret.
--
--   responses
--   ├── response_items            menu items the guest wants (with a quantity)
--   │   ├── response_item_choices   their pick in each option group
--   │   └── response_item_addons    the add-ons they ticked
--   └── response_date_votes       poll slots the guest can make (yes / maybe)
--
-- Guests never touch these tables directly (no insert/update/select policies
-- for them). They go through two functions instead:
--
--   save_response(brunch_id, response_id, payload) → uuid
--       response_id null = create, otherwise replace that response.
--   get_response(response_id) → jsonb
--       Returns the same payload shape, or null if the id is unknown.
--
-- Knowing the response id is what grants access, so the page can live at
-- /invites/:brunchId/:responseId and be bookmarked or texted around. The
-- functions also validate that picks belong to the brunch's menu, which plain
-- RLS could not.
--
-- Payload shape:
--   {
--     "guest_name": "Sam",
--     "notes": "No nuts please",
--     "items": [
--       { "item_id": "…", "quantity": 2, "option_choice_ids": ["…"], "addon_ids": ["…"] }
--     ],
--     "date_votes": [ { "date_option_id": "…", "availability": "yes" | "maybe" } ]
--   }
-- A poll slot with no vote row means "can't make it".
--
-- save_response rejects brunches whose invites haven't been sent and brunches
-- past responses_close_at. get_response keeps working so guests can still
-- look at what they submitted.
--
-- The host reads responses straight from the tables (owner-only select).
--
-- Invite-only brunches (brunches.invite_only): the host creates a response per
-- guest by inserting a bare row (just guest_name) and shares that guest's link.
-- `responded_at` stays null until the guest actually saves, so the host can see
-- who hasn't answered. Hosts can also rename or delete responses; picks and
-- votes are only ever written through save_response.

create type public.date_availability as enum ('yes', 'maybe');

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  brunch_id uuid not null references public.brunches (id) on delete cascade,
  guest_name text not null check (length(trim(guest_name)) > 0),
  notes text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- quantity applies to the whole line: 2 × "Toast" with "+ Egg" means 2 eggs.
create table public.response_items (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 20),
  unique (response_id, item_id)
);

create table public.response_item_choices (
  response_item_id uuid not null references public.response_items (id) on delete cascade,
  option_choice_id uuid not null references public.option_choices (id) on delete cascade,
  primary key (response_item_id, option_choice_id)
);

create table public.response_item_addons (
  response_item_id uuid not null references public.response_items (id) on delete cascade,
  addon_id uuid not null references public.addons (id) on delete cascade,
  primary key (response_item_id, addon_id)
);

create table public.response_date_votes (
  response_id uuid not null references public.responses (id) on delete cascade,
  date_option_id uuid not null references public.brunch_date_options (id) on delete cascade,
  availability public.date_availability not null,
  primary key (response_id, date_option_id)
);

create index responses_brunch_id_idx on public.responses (brunch_id);
create index response_items_response_id_idx on public.response_items (response_id);
create index response_items_item_id_idx on public.response_items (item_id);
create index response_item_choices_choice_idx on public.response_item_choices (option_choice_id);
create index response_item_addons_addon_idx on public.response_item_addons (addon_id);
create index response_date_votes_option_idx on public.response_date_votes (date_option_id);

-- ---------------------------------------------------------------------------
-- Row level security: host reads only. Guests use the functions below.
-- ---------------------------------------------------------------------------

create function public.owns_response(p_response_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.responses r
    join public.brunches b on b.id = r.brunch_id
    where r.id = p_response_id and b.owner_id = auth.uid()
  );
$$;

create function public.owns_response_item(p_response_item_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.response_items ri
    join public.responses r on r.id = ri.response_id
    join public.brunches b on b.id = r.brunch_id
    where ri.id = p_response_item_id and b.owner_id = auth.uid()
  );
$$;

alter table public.responses enable row level security;
alter table public.response_items enable row level security;
alter table public.response_item_choices enable row level security;
alter table public.response_item_addons enable row level security;
alter table public.response_date_votes enable row level security;

create policy "responses: owner can read" on public.responses
  for select using (public.owns_brunch(brunch_id));

create policy "responses: owner can add guests" on public.responses
  for insert with check (public.owns_brunch(brunch_id));

create policy "responses: owner can rename guests" on public.responses
  for update using (public.owns_brunch(brunch_id)) with check (public.owns_brunch(brunch_id));

create policy "responses: owner can remove guests" on public.responses
  for delete using (public.owns_brunch(brunch_id));

create policy "response_items: owner can read" on public.response_items
  for select using (public.owns_response(response_id));

create policy "response_item_choices: owner can read" on public.response_item_choices
  for select using (public.owns_response_item(response_item_id));

create policy "response_item_addons: owner can read" on public.response_item_addons
  for select using (public.owns_response_item(response_item_id));

create policy "response_date_votes: owner can read" on public.response_date_votes
  for select using (public.owns_response(response_id));

-- ---------------------------------------------------------------------------
-- save_response: create or fully replace a response
-- ---------------------------------------------------------------------------

create function public.save_response(
  p_brunch_id uuid,
  p_response_id uuid,
  p_payload jsonb
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

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'items', '[]')) loop
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
  where v_votes_open;

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

  return v_response_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_response: read one response by its id, same shape as the save payload
-- ---------------------------------------------------------------------------

create function public.get_response(p_response_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'brunch_id', r.brunch_id,
    'guest_name', r.guest_name,
    'notes', r.notes,
    'responded_at', r.responded_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item_id', ri.item_id,
        'quantity', ri.quantity,
        'option_choice_ids', coalesce((
          select jsonb_agg(ric.option_choice_id)
          from public.response_item_choices ric
          where ric.response_item_id = ri.id
        ), '[]'),
        'addon_ids', coalesce((
          select jsonb_agg(ria.addon_id)
          from public.response_item_addons ria
          where ria.response_item_id = ri.id
        ), '[]')
      ))
      from public.response_items ri
      where ri.response_id = r.id
    ), '[]'),
    'date_votes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date_option_id', dv.date_option_id,
        'availability', dv.availability
      ))
      from public.response_date_votes dv
      where dv.response_id = r.id
    ), '[]')
  )
  from public.responses r
  where r.id = p_response_id;
$$;
