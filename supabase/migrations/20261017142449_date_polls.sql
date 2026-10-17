-- Date polls: guards around slot editing and an atomic "pick winner".
--
-- A poll brunch (scheduling = 'poll') keeps starts_at null while guests vote on
-- brunch_date_options. Picking a winner sets starts_at to the chosen slot, which
-- freezes the poll: slots can no longer be added or changed, and save_response
-- already ignores new votes from then on.
--
-- Additive for deployed clients: no existing function signature changes and the
-- deployed client never writes slots or polls, so none of the guards below can
-- fire for it. Tally reads need nothing new: owners and collaborators can
-- already select response_date_votes and brunch_date_options.

-- ---------------------------------------------------------------------------
-- Slot guards
-- ---------------------------------------------------------------------------

create function public.guard_date_option_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brunch public.brunches;
  v_brunch_id uuid := coalesce(new.brunch_id, old.brunch_id);
begin
  if tg_op = 'UPDATE' and new.brunch_id <> old.brunch_id then
    raise exception 'a date option cannot move to another brunch';
  end if;

  select * into v_brunch from public.brunches where id = v_brunch_id;
  -- Brunch already gone: this is the cascade of deleting the brunch.
  if not found then
    return coalesce(new, old);
  end if;

  if tg_op <> 'DELETE' and v_brunch.scheduling <> 'poll' then
    raise exception 'only poll brunches have date options';
  end if;

  if v_brunch.scheduling = 'poll' and v_brunch.starts_at is not null then
    raise exception 'the date is already picked, the poll is frozen';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger brunch_date_options_guard
  before insert or update or delete on public.brunch_date_options
  for each row execute function public.guard_date_option_changes();

create function public.guard_brunch_poll()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.scheduling is distinct from old.scheduling then
    if old.invites_sent_at is not null then
      raise exception 'the scheduling mode cannot change once invites are sent';
    end if;
    if new.scheduling = 'poll' and new.starts_at is not null then
      raise exception 'a poll has no date until a winner is picked';
    end if;
  end if;

  if new.scheduling = 'poll' then
    if old.scheduling = 'poll'
       and old.starts_at is not null
       and new.starts_at is distinct from old.starts_at then
      raise exception 'the date is already picked';
    end if;

    if new.starts_at is not null
       and new.starts_at is distinct from old.starts_at
       and not exists (
         select 1 from public.brunch_date_options
         where brunch_id = new.id and starts_at = new.starts_at
       ) then
      raise exception 'the date must be one of the poll options';
    end if;

    if old.invites_sent_at is null
       and new.invites_sent_at is not null
       and not exists (
         select 1 from public.brunch_date_options where brunch_id = new.id
       ) then
      raise exception 'add date options before sending invites';
    end if;
  end if;

  return new;
end;
$$;

create trigger brunches_poll_guard
  before update on public.brunches
  for each row execute function public.guard_brunch_poll();

-- ---------------------------------------------------------------------------
-- pick_date_winner
-- ---------------------------------------------------------------------------

create function public.pick_date_winner(p_brunch_id uuid, p_date_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_brunch public.brunches;
  v_slot timestamptz;
begin
  if not public.can_manage_brunch(p_brunch_id) then
    raise exception 'Only the host or a co-host can pick the date';
  end if;

  select * into v_brunch from public.brunches where id = p_brunch_id for update;
  if not found then
    raise exception 'brunch not found';
  end if;
  if v_brunch.scheduling <> 'poll' then
    raise exception 'this brunch has no date poll';
  end if;
  if v_brunch.invites_sent_at is null then
    raise exception 'send the invites before picking a date';
  end if;
  if v_brunch.starts_at is not null then
    raise exception 'the date is already picked';
  end if;

  select starts_at into v_slot
  from public.brunch_date_options
  where id = p_date_option_id and brunch_id = p_brunch_id;
  if not found then
    raise exception 'date option does not belong to this brunch';
  end if;

  update public.brunches set starts_at = v_slot where id = p_brunch_id;
end;
$$;

revoke execute on function public.pick_date_winner(uuid, uuid) from public, anon;
grant execute on function public.pick_date_winner(uuid, uuid) to authenticated;
