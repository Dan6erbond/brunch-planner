-- Same atomic, RLS-respecting pattern as reorder_items, for option groups,
-- their choices, and add-ons.
create function public.reorder_option_groups(p_item_id uuid, p_group_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.option_groups g
  set position = o.ord - 1
  from unnest(p_group_ids) with ordinality as o(id, ord)
  where g.id = o.id
    and g.item_id = p_item_id;
$$;

create function public.reorder_option_choices(p_group_id uuid, p_choice_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.option_choices c
  set position = o.ord - 1
  from unnest(p_choice_ids) with ordinality as o(id, ord)
  where c.id = o.id
    and c.option_group_id = p_group_id;
$$;

create function public.reorder_addons(p_item_id uuid, p_addon_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.addons a
  set position = o.ord - 1
  from unnest(p_addon_ids) with ordinality as o(id, ord)
  where a.id = o.id
    and a.item_id = p_item_id;
$$;

revoke execute on function public.reorder_option_groups(uuid, uuid[]) from public, anon;
revoke execute on function public.reorder_option_choices(uuid, uuid[]) from public, anon;
revoke execute on function public.reorder_addons(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_option_groups(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_option_choices(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_addons(uuid, uuid[]) to authenticated;
