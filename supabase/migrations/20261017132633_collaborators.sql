-- Collaborators: share a menu or a brunch with other signed-in users.
--
--   menu_collaborators   viewer (read) | editor (edit menu content, not delete / share)
--   brunch_collaborators viewer (read) | co_host (manage the brunch, not delete / share)
--
-- `owner_id` stays the single owner. Policies go through the can_* helpers
-- below; the owner is always included. Reading a brunch's menu is granted via
-- the brunch collaborator row. Collaborators are added through the
-- add_*_collaborator RPCs (email lookup, owner only), not by direct insert.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create type public.menu_collaborator_role as enum ('viewer', 'editor');
create type public.brunch_collaborator_role as enum ('viewer', 'co_host');

create table public.menu_collaborators (
  menu_id uuid not null references public.menus (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.menu_collaborator_role not null,
  created_at timestamptz not null default now(),
  primary key (menu_id, user_id)
);

create table public.brunch_collaborators (
  brunch_id uuid not null references public.brunches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.brunch_collaborator_role not null,
  created_at timestamptz not null default now(),
  primary key (brunch_id, user_id)
);

create index menu_collaborators_user_id_idx on public.menu_collaborators (user_id);
create index brunch_collaborators_user_id_idx on public.brunch_collaborators (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create function public.can_read_menu(p_menu_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.menus where id = p_menu_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.menu_collaborators
    where menu_id = p_menu_id and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.brunches b
    join public.brunch_collaborators bc on bc.brunch_id = b.id
    where b.menu_id = p_menu_id and bc.user_id = auth.uid()
  );
$$;

create function public.can_edit_menu(p_menu_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.menus where id = p_menu_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.menu_collaborators
    where menu_id = p_menu_id and user_id = auth.uid() and role = 'editor'
  );
$$;

create function public.can_read_brunch(p_brunch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.brunches where id = p_brunch_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.brunch_collaborators
    where brunch_id = p_brunch_id and user_id = auth.uid()
  );
$$;

create function public.can_manage_brunch(p_brunch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.brunches where id = p_brunch_id and owner_id = auth.uid()
  )
  or exists (
    select 1 from public.brunch_collaborators
    where brunch_id = p_brunch_id and user_id = auth.uid() and role = 'co_host'
  );
$$;

-- Resolve a child row to its menu / brunch, so a policy reads
-- can_edit_menu(item_menu_id(item_id)). Null in, null out (so can_* is false).
create function public.item_menu_id(p_item_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select menu_id from public.items where id = p_item_id;
$$;

create function public.option_group_menu_id(p_group_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select i.menu_id
  from public.option_groups g
  join public.items i on i.id = g.item_id
  where g.id = p_group_id;
$$;

create function public.option_choice_menu_id(p_choice_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select i.menu_id
  from public.option_choices c
  join public.option_groups g on g.id = c.option_group_id
  join public.items i on i.id = g.item_id
  where c.id = p_choice_id;
$$;

create function public.addon_menu_id(p_addon_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select i.menu_id
  from public.addons a
  join public.items i on i.id = a.item_id
  where a.id = p_addon_id;
$$;

create function public.response_brunch_id(p_response_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select brunch_id from public.responses where id = p_response_id;
$$;

create function public.response_item_brunch_id(p_response_item_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select r.brunch_id
  from public.response_items ri
  join public.responses r on r.id = ri.response_id
  where ri.id = p_response_item_id;
$$;

-- Collaborators must not be able to hand the entity to someone else.
create function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner cannot be changed';
  end if;
  return new;
end;
$$;

create trigger menus_prevent_owner_change
  before update on public.menus
  for each row execute function public.prevent_owner_change();

create trigger brunches_prevent_owner_change
  before update on public.brunches
  for each row execute function public.prevent_owner_change();

-- ---------------------------------------------------------------------------
-- Row level security: collaborator tables
-- ---------------------------------------------------------------------------
-- No insert policy: rows are created by the add_*_collaborator RPCs.

alter table public.menu_collaborators enable row level security;
alter table public.brunch_collaborators enable row level security;

create policy "menu_collaborators: own row or owner can read" on public.menu_collaborators
  for select using (user_id = auth.uid() or public.owns_menu(menu_id));

create policy "menu_collaborators: owner can change role" on public.menu_collaborators
  for update using (public.owns_menu(menu_id)) with check (public.owns_menu(menu_id));

create policy "menu_collaborators: owner can remove, anyone can leave" on public.menu_collaborators
  for delete using (user_id = auth.uid() or public.owns_menu(menu_id));

create policy "brunch_collaborators: own row or owner can read" on public.brunch_collaborators
  for select using (user_id = auth.uid() or public.owns_brunch(brunch_id));

create policy "brunch_collaborators: owner can change role" on public.brunch_collaborators
  for update using (public.owns_brunch(brunch_id)) with check (public.owns_brunch(brunch_id));

create policy "brunch_collaborators: owner can remove, anyone can leave" on public.brunch_collaborators
  for delete using (user_id = auth.uid() or public.owns_brunch(brunch_id));

-- ---------------------------------------------------------------------------
-- Row level security: menus and children
-- ---------------------------------------------------------------------------
-- The owner_id check in the menus select policy covers INSERT ... RETURNING,
-- where a stable helper would not see the new row yet.

drop policy "menus: owner full access" on public.menus;
drop policy "items: owner full access" on public.items;
drop policy "option_groups: owner full access" on public.option_groups;
drop policy "option_choices: owner full access" on public.option_choices;
drop policy "addons: owner full access" on public.addons;
drop policy "ingredients: owner full access" on public.ingredients;

create policy "menus: owner or collaborator can read" on public.menus
  for select using (owner_id = auth.uid() or public.can_read_menu(id));

create policy "menus: owner can create" on public.menus
  for insert with check (owner_id = auth.uid());

create policy "menus: editor can update" on public.menus
  for update using (public.can_edit_menu(id)) with check (public.can_edit_menu(id));

create policy "menus: owner can delete" on public.menus
  for delete using (owner_id = auth.uid());

create policy "items: collaborator can read" on public.items
  for select using (public.can_read_menu(menu_id));

create policy "items: editor can write" on public.items
  for all using (public.can_edit_menu(menu_id)) with check (public.can_edit_menu(menu_id));

create policy "option_groups: collaborator can read" on public.option_groups
  for select using (public.can_read_menu(public.item_menu_id(item_id)));

create policy "option_groups: editor can write" on public.option_groups
  for all
  using (public.can_edit_menu(public.item_menu_id(item_id)))
  with check (public.can_edit_menu(public.item_menu_id(item_id)));

create policy "option_choices: collaborator can read" on public.option_choices
  for select using (public.can_read_menu(public.option_group_menu_id(option_group_id)));

create policy "option_choices: editor can write" on public.option_choices
  for all
  using (public.can_edit_menu(public.option_group_menu_id(option_group_id)))
  with check (public.can_edit_menu(public.option_group_menu_id(option_group_id)));

create policy "addons: collaborator can read" on public.addons
  for select using (public.can_read_menu(public.item_menu_id(item_id)));

create policy "addons: editor can write" on public.addons
  for all
  using (public.can_edit_menu(public.item_menu_id(item_id)))
  with check (public.can_edit_menu(public.item_menu_id(item_id)));

-- ingredients: a null parent id resolves to a null menu, so only the set parent counts
create policy "ingredients: collaborator can read" on public.ingredients
  for select
  using (
    public.can_read_menu(public.item_menu_id(item_id))
    or public.can_read_menu(public.option_choice_menu_id(option_choice_id))
    or public.can_read_menu(public.addon_menu_id(addon_id))
  );

create policy "ingredients: editor can write" on public.ingredients
  for all
  using (
    public.can_edit_menu(public.item_menu_id(item_id))
    or public.can_edit_menu(public.option_choice_menu_id(option_choice_id))
    or public.can_edit_menu(public.addon_menu_id(addon_id))
  )
  with check (
    public.can_edit_menu(public.item_menu_id(item_id))
    or public.can_edit_menu(public.option_choice_menu_id(option_choice_id))
    or public.can_edit_menu(public.addon_menu_id(addon_id))
  );

drop function public.owns_item(uuid);
drop function public.owns_option_group(uuid);
drop function public.owns_option_choice(uuid);
drop function public.owns_addon(uuid);

-- ---------------------------------------------------------------------------
-- Row level security: brunches, date options, responses
-- ---------------------------------------------------------------------------
-- "brunches: public read once invites are sent" stays as is.

drop policy "brunches: owner can write" on public.brunches;
drop policy "brunch_date_options: owner can write" on public.brunch_date_options;
drop policy "responses: owner can read" on public.responses;
drop policy "responses: owner can add guests" on public.responses;
drop policy "responses: owner can rename guests" on public.responses;
drop policy "responses: owner can remove guests" on public.responses;
drop policy "response_items: owner can read" on public.response_items;
drop policy "response_item_choices: owner can read" on public.response_item_choices;
drop policy "response_item_addons: owner can read" on public.response_item_addons;
drop policy "response_date_votes: owner can read" on public.response_date_votes;

create policy "brunches: owner or collaborator can read" on public.brunches
  for select using (owner_id = auth.uid() or public.can_read_brunch(id));

create policy "brunches: owner can create" on public.brunches
  for insert with check (owner_id = auth.uid() and public.owns_menu(menu_id));

create policy "brunches: co-host can update" on public.brunches
  for update
  using (public.can_manage_brunch(id))
  with check (public.can_manage_brunch(id) and public.can_read_menu(menu_id));

create policy "brunches: owner can delete" on public.brunches
  for delete using (owner_id = auth.uid());

create policy "brunch_date_options: collaborator can read" on public.brunch_date_options
  for select using (public.can_read_brunch(brunch_id));

create policy "brunch_date_options: co-host can write" on public.brunch_date_options
  for all
  using (public.can_manage_brunch(brunch_id))
  with check (public.can_manage_brunch(brunch_id));

create policy "responses: collaborator can read" on public.responses
  for select using (public.can_read_brunch(brunch_id));

create policy "responses: co-host can add guests" on public.responses
  for insert with check (public.can_manage_brunch(brunch_id));

create policy "responses: co-host can rename guests" on public.responses
  for update
  using (public.can_manage_brunch(brunch_id))
  with check (public.can_manage_brunch(brunch_id));

create policy "responses: co-host can remove guests" on public.responses
  for delete using (public.can_manage_brunch(brunch_id));

create policy "response_items: collaborator can read" on public.response_items
  for select using (public.can_read_brunch(public.response_brunch_id(response_id)));

create policy "response_item_choices: collaborator can read" on public.response_item_choices
  for select using (public.can_read_brunch(public.response_item_brunch_id(response_item_id)));

create policy "response_item_addons: collaborator can read" on public.response_item_addons
  for select using (public.can_read_brunch(public.response_item_brunch_id(response_item_id)));

create policy "response_date_votes: collaborator can read" on public.response_date_votes
  for select using (public.can_read_brunch(public.response_brunch_id(response_id)));

drop function public.owns_response(uuid);
drop function public.owns_response_item(uuid);

-- ---------------------------------------------------------------------------
-- RPCs: add a collaborator by email (owner only)
-- ---------------------------------------------------------------------------
-- auth.users is only reachable through these functions, and only for the owner
-- of the entity.

create function public.add_menu_collaborator(
  p_menu_id uuid,
  p_email text,
  p_role public.menu_collaborator_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not public.owns_menu(p_menu_id) then
    raise exception 'Only the owner can share this menu';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'No account with that email';
  end if;

  if v_user_id = auth.uid() then
    raise exception 'You already own this menu';
  end if;

  if exists (
    select 1 from public.menu_collaborators where menu_id = p_menu_id and user_id = v_user_id
  ) then
    raise exception 'Already a collaborator on this menu';
  end if;

  insert into public.menu_collaborators (menu_id, user_id, role)
  values (p_menu_id, v_user_id, p_role);
end;
$$;

create function public.add_brunch_collaborator(
  p_brunch_id uuid,
  p_email text,
  p_role public.brunch_collaborator_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not public.owns_brunch(p_brunch_id) then
    raise exception 'Only the owner can share this brunch';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'No account with that email';
  end if;

  if v_user_id = auth.uid() then
    raise exception 'You already own this brunch';
  end if;

  if exists (
    select 1 from public.brunch_collaborators where brunch_id = p_brunch_id and user_id = v_user_id
  ) then
    raise exception 'Already a collaborator on this brunch';
  end if;

  insert into public.brunch_collaborators (brunch_id, user_id, role)
  values (p_brunch_id, v_user_id, p_role);
end;
$$;

revoke execute on function public.add_menu_collaborator(uuid, text, public.menu_collaborator_role) from public, anon;
revoke execute on function public.add_brunch_collaborator(uuid, text, public.brunch_collaborator_role) from public, anon;
grant execute on function public.add_menu_collaborator(uuid, text, public.menu_collaborator_role) to authenticated;
grant execute on function public.add_brunch_collaborator(uuid, text, public.brunch_collaborator_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Co-host names for the public invite header (viewers are never exposed)
-- ---------------------------------------------------------------------------
-- Sibling of get_brunch_host_name so the existing call keeps its text return type.

create function public.get_brunch_cohost_names(p_brunch_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array_agg(trim(p.display_name) order by bc.created_at)
      filter (where nullif(trim(p.display_name), '') is not null),
    '{}'
  )
  from public.brunches b
  join public.brunch_collaborators bc on bc.brunch_id = b.id and bc.role = 'co_host'
  join public.profiles p on p.id = bc.user_id
  where b.id = p_brunch_id and b.invites_sent_at is not null;
$$;
