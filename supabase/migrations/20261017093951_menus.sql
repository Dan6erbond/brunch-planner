-- Menus and everything hanging off them.
--
--   menus
--   └── items                  e.g. "Avocado Toast"
--       ├── option_groups      single-choice, e.g. "Bread"
--       │   └── option_choices   sourdough / rye / gluten-free
--       └── addons             multi-choice extras, e.g. "+ Poached Egg"
--
--   ingredients (host only) attach to an item, an option choice, or an add-on.
--
-- Only `menus.owner_id` is stored. Child tables get ownership by walking up to
-- the menu via the helper functions below, so a child row can never be owned by
-- someone other than the menu's owner.
--
-- Visibility here is host-only. The public read policies that let guests see a
-- menu once a brunch uses it live in the brunches migration.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  required boolean not null default true,
  position int not null default 0
);

create table public.option_choices (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.option_groups (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  position int not null default 0
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  position int not null default 0
);

-- An ingredient hangs off exactly one of: an item, an option choice, or an
-- add-on. It is only needed when the guest actually picks that thing, e.g.
-- "3 eggs" on the "+ Scrambled Egg" add-on. Quantity is per serving (one guest
-- ordering the item once); the shopping list multiplies by the ordered quantity.
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items (id) on delete cascade,
  option_choice_id uuid references public.option_choices (id) on delete cascade,
  addon_id uuid references public.addons (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  quantity numeric check (quantity > 0),
  unit text,
  constraint ingredients_exactly_one_parent
    check (num_nonnulls(item_id, option_choice_id, addon_id) = 1)
);

create index items_menu_id_idx on public.items (menu_id);
create index option_groups_item_id_idx on public.option_groups (item_id);
create index option_choices_group_id_idx on public.option_choices (option_group_id);
create index addons_item_id_idx on public.addons (item_id);
create index ingredients_item_id_idx on public.ingredients (item_id);
create index ingredients_option_choice_id_idx on public.ingredients (option_choice_id);
create index ingredients_addon_id_idx on public.ingredients (addon_id);

-- ---------------------------------------------------------------------------
-- Helper functions used by the policies
-- ---------------------------------------------------------------------------

create function public.owns_menu(p_menu_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.menus where id = p_menu_id and owner_id = auth.uid()
  );
$$;

create function public.owns_item(p_item_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.menus m on m.id = i.menu_id
    where i.id = p_item_id and m.owner_id = auth.uid()
  );
$$;

create function public.owns_option_group(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.option_groups g
    join public.items i on i.id = g.item_id
    join public.menus m on m.id = i.menu_id
    where g.id = p_group_id and m.owner_id = auth.uid()
  );
$$;

create function public.owns_option_choice(p_choice_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.option_choices c
    join public.option_groups g on g.id = c.option_group_id
    join public.items i on i.id = g.item_id
    join public.menus m on m.id = i.menu_id
    where c.id = p_choice_id and m.owner_id = auth.uid()
  );
$$;

create function public.owns_addon(p_addon_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.addons a
    join public.items i on i.id = a.item_id
    join public.menus m on m.id = i.menu_id
    where a.id = p_addon_id and m.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.menus enable row level security;
alter table public.items enable row level security;
alter table public.option_groups enable row level security;
alter table public.option_choices enable row level security;
alter table public.addons enable row level security;
alter table public.ingredients enable row level security;

-- menus
create policy "menus: owner full access" on public.menus
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- items
create policy "items: owner full access" on public.items
  for all using (public.owns_menu(menu_id)) with check (public.owns_menu(menu_id));

-- option_groups
create policy "option_groups: owner full access" on public.option_groups
  for all using (public.owns_item(item_id)) with check (public.owns_item(item_id));

-- option_choices
create policy "option_choices: owner full access" on public.option_choices
  for all using (public.owns_option_group(option_group_id))
  with check (public.owns_option_group(option_group_id));

-- addons
create policy "addons: owner full access" on public.addons
  for all using (public.owns_item(item_id)) with check (public.owns_item(item_id));

-- ingredients (the helpers return false for a null id, so only the set parent counts)
create policy "ingredients: owner full access" on public.ingredients
  for all
  using (
    public.owns_item(item_id)
    or public.owns_option_choice(option_choice_id)
    or public.owns_addon(addon_id)
  )
  with check (
    public.owns_item(item_id)
    or public.owns_option_choice(option_choice_id)
    or public.owns_addon(addon_id)
  );
