create type public.ingredient_unit as enum (
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'
);

alter table public.ingredients
  alter column unit type public.ingredient_unit
  using (
    case
      when unit in ('g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece')
        then unit::public.ingredient_unit
    end
  );
