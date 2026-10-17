-- Atomic reorder: one statement sets every position, so a failure never leaves
-- a half-reordered menu. SECURITY INVOKER keeps the items RLS policies in force.
create function public.reorder_items(p_menu_id uuid, p_item_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.items i
  set position = o.ord - 1
  from unnest(p_item_ids) with ordinality as o(id, ord)
  where i.id = o.id
    and i.menu_id = p_menu_id;
$$;

revoke execute on function public.reorder_items(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_items(uuid, uuid[]) to authenticated;
