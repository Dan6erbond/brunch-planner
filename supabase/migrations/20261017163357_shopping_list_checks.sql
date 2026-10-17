-- Ticked-off lines of a brunch's shopping list. A row means "checked";
-- unchecking deletes it. `line_key` is derived client-side from the displayed
-- line (see src/features/brunches/shopping-list.ts) because the list
-- aggregates ingredient rows, so there is no single row id to point at.

create table public.shopping_list_checks (
  brunch_id uuid not null references public.brunches (id) on delete cascade,
  line_key text not null,
  checked_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (brunch_id, line_key)
);

alter table public.shopping_list_checks enable row level security;

create policy "shopping_list_checks: collaborator can read" on public.shopping_list_checks
  for select using (public.can_read_brunch(brunch_id));

create policy "shopping_list_checks: co-host can check" on public.shopping_list_checks
  for insert with check (
    public.can_manage_brunch(brunch_id) and checked_by = auth.uid()
  );

create policy "shopping_list_checks: co-host can uncheck" on public.shopping_list_checks
  for delete using (public.can_manage_brunch(brunch_id));
