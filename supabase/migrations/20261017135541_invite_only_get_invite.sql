-- Invite-only brunches: get_invite only reveals the brunch to someone holding a
-- valid per-guest response id (or a host/collaborator). Everyone else gets a
-- bare stub {id, invite_only, locked}, so the menu and details never leak.
--
-- Hosts add guests by inserting into responses directly (RLS from the
-- collaborators migration already limits that to owner and co-hosts), and
-- save_response already rejects creating a response on an invite-only brunch.
--
-- Additive for deployed clients: the old get_invite(uuid) body moves to
-- get_invite_unchecked (not callable by API roles), and the new get_invite has
-- an optional second parameter, so one-argument calls keep working. Open
-- brunches return the same payload as before.

alter function public.get_invite(uuid) rename to get_invite_unchecked;
revoke execute on function public.get_invite_unchecked(uuid) from public, anon, authenticated;

create function public.get_invite(p_brunch_id uuid, p_response_id uuid default null)
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
    return v_invite;
  end if;

  if public.can_read_brunch(p_brunch_id) or exists (
    select 1 from public.responses
    where id = p_response_id and brunch_id = p_brunch_id
  ) then
    return v_invite;
  end if;

  return jsonb_build_object('id', p_brunch_id, 'invite_only', true, 'locked', true);
end;
$$;

revoke execute on function public.get_invite(uuid, uuid) from public;
grant execute on function public.get_invite(uuid, uuid) to anon, authenticated;
