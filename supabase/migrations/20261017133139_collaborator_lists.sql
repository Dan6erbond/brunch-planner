-- Collaborator lists (owner only, includes email from auth.users) and "what is my role" helpers.

create function public.list_menu_collaborators(p_menu_id uuid)
returns table (user_id uuid, display_name text, email text, role public.menu_collaborator_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.owns_menu(p_menu_id) then
    raise exception 'Only the owner can see who has access';
  end if;

  return query
  select mc.user_id, p.display_name, u.email::text, mc.role
  from public.menu_collaborators mc
  join auth.users u on u.id = mc.user_id
  left join public.profiles p on p.id = mc.user_id
  where mc.menu_id = p_menu_id
  order by mc.created_at;
end;
$$;

create function public.list_brunch_collaborators(p_brunch_id uuid)
returns table (user_id uuid, display_name text, email text, role public.brunch_collaborator_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.owns_brunch(p_brunch_id) then
    raise exception 'Only the owner can see who has access';
  end if;

  return query
  select bc.user_id, p.display_name, u.email::text, bc.role
  from public.brunch_collaborators bc
  join auth.users u on u.id = bc.user_id
  left join public.profiles p on p.id = bc.user_id
  where bc.brunch_id = p_brunch_id
  order by bc.created_at;
end;
$$;

create function public.my_menu_role(p_menu_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.menus where id = p_menu_id and owner_id = auth.uid()
    ) then 'owner'
    else coalesce(
      (
        select mc.role::text from public.menu_collaborators mc
        where mc.menu_id = p_menu_id and mc.user_id = auth.uid()
      ),
      'none'
    )
  end;
$$;

create function public.my_brunch_role(p_brunch_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.brunches where id = p_brunch_id and owner_id = auth.uid()
    ) then 'owner'
    else coalesce(
      (
        select bc.role::text from public.brunch_collaborators bc
        where bc.brunch_id = p_brunch_id and bc.user_id = auth.uid()
      ),
      'none'
    )
  end;
$$;

revoke execute on function public.list_menu_collaborators(uuid) from public, anon;
revoke execute on function public.list_brunch_collaborators(uuid) from public, anon;
revoke execute on function public.my_menu_role(uuid) from public, anon;
revoke execute on function public.my_brunch_role(uuid) from public, anon;
grant execute on function public.list_menu_collaborators(uuid) to authenticated;
grant execute on function public.list_brunch_collaborators(uuid) to authenticated;
grant execute on function public.my_menu_role(uuid) to authenticated;
grant execute on function public.my_brunch_role(uuid) to authenticated;
