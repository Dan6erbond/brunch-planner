-- Brunches (events) and their optional date/time poll.
--
-- A brunch's id doubles as the public invite id (/invites/:id).
--
-- Scheduling:
--   fixed → starts_at is required.
--   poll  → candidate slots live in brunch_date_options; starts_at stays null
--           until the host picks a winner. Setting starts_at closes the poll.
--
-- Lifecycle (derived from timestamps, see the brunches_with_status view):
--   draft  → invites_sent_at is null. Only the host can see the brunch.
--   open   → invites sent, and responses_close_at is null or still in the future.
--   closed → responses_close_at has passed. Guests can still view their response.
-- Setting invites_sent_at is what the UI's "Send invites" button does; after
-- that the invite link starts working for guests.

create type public.brunch_scheduling as enum ('fixed', 'poll');

create table public.brunches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  menu_id uuid not null references public.menus (id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  description text,
  location text,
  scheduling public.brunch_scheduling not null default 'fixed',
  starts_at timestamptz,
  invites_sent_at timestamptz,
  responses_close_at timestamptz,
  -- true = guests can't create their own response from the shared link; the
  -- host adds each guest by name and shares each guest's personal link.
  invite_only boolean not null default false,
  created_at timestamptz not null default now(),
  constraint brunches_fixed_needs_starts_at
    check (scheduling = 'poll' or starts_at is not null)
);

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

create table public.brunch_date_options (
  id uuid primary key default gen_random_uuid(),
  brunch_id uuid not null references public.brunches (id) on delete cascade,
  starts_at timestamptz not null,
  unique (brunch_id, starts_at)
);

create index brunches_owner_id_idx on public.brunches (owner_id);
create index brunches_menu_id_idx on public.brunches (menu_id);
create index brunch_date_options_brunch_id_idx on public.brunch_date_options (brunch_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create function public.owns_brunch(p_brunch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.brunches where id = p_brunch_id and owner_id = auth.uid()
  );
$$;

create function public.brunch_is_sent(p_brunch_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.brunches where id = p_brunch_id and invites_sent_at is not null
  );
$$;

-- "Published" = at least one brunch with sent invites uses the menu. Guests may
-- read those menus.
create function public.menu_is_published(p_menu_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.brunches
    where menu_id = p_menu_id and invites_sent_at is not null
  );
$$;

create function public.item_is_published(p_item_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.items i
    join public.brunches b on b.menu_id = i.menu_id
    where i.id = p_item_id and b.invites_sent_at is not null
  );
$$;

create function public.option_group_is_published(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.option_groups g
    join public.items i on i.id = g.item_id
    join public.brunches b on b.menu_id = i.menu_id
    where g.id = p_group_id and b.invites_sent_at is not null
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security: brunches
-- ---------------------------------------------------------------------------

alter table public.brunches enable row level security;
alter table public.brunch_date_options enable row level security;

-- Anyone with the invite link can read the brunch and its poll options, but
-- only after the host has sent the invites. Drafts are host-only.
create policy "brunches: public read once invites are sent" on public.brunches
  for select using (invites_sent_at is not null);

create policy "brunches: owner can write" on public.brunches
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.owns_menu(menu_id));

create policy "brunch_date_options: public read once invites are sent" on public.brunch_date_options
  for select using (public.brunch_is_sent(brunch_id));

create policy "brunch_date_options: owner can write" on public.brunch_date_options
  for all using (public.owns_brunch(brunch_id)) with check (public.owns_brunch(brunch_id));

-- ---------------------------------------------------------------------------
-- Row level security: guests can read menus that a brunch uses
-- ---------------------------------------------------------------------------
-- Only menus used by a brunch whose invites were sent are visible.
-- Added here (not in the menus migration) because they depend on brunches.
-- Ingredients are deliberately left out: host only.

create policy "menus: public read when used by a brunch" on public.menus
  for select using (public.menu_is_published(id));

create policy "items: public read when used by a brunch" on public.items
  for select using (public.menu_is_published(menu_id));

create policy "option_groups: public read when used by a brunch" on public.option_groups
  for select using (public.item_is_published(item_id));

create policy "option_choices: public read when used by a brunch" on public.option_choices
  for select using (public.option_group_is_published(option_group_id));

create policy "addons: public read when used by a brunch" on public.addons
  for select using (public.item_is_published(item_id));
