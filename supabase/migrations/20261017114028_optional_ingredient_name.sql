alter table public.ingredients alter column name drop not null;

alter table public.ingredients drop constraint ingredients_name_check;

update public.ingredients set name = null where length(trim(name)) = 0;

alter table public.ingredients
  add constraint ingredients_name_not_blank
    check (name is null or length(trim(name)) > 0),
  add constraint ingredients_item_requires_name
    check (item_id is null or name is not null);
