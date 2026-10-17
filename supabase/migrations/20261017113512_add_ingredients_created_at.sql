alter table public.ingredients
  add column created_at timestamptz not null default now();
