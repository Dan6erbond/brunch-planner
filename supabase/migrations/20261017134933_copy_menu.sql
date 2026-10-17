-- Deep-copies a menu the caller can read into a new menu owned by the caller.
-- Ingredient created_at is carried over because it defines their display order.
create function public.copy_menu(p_menu_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_menu_id uuid;
  v_item record;
  v_group record;
  v_choice record;
  v_addon record;
  v_item_id uuid;
  v_group_id uuid;
  v_choice_id uuid;
  v_addon_id uuid;
begin
  if auth.uid() is null or not public.can_read_menu(p_menu_id) then
    raise exception 'Menu not found or not accessible' using errcode = '42501';
  end if;

  insert into public.menus (owner_id, name, description)
  select auth.uid(), 'Copy of ' || name, description
  from public.menus where id = p_menu_id
  returning id into v_menu_id;

  for v_item in select * from public.items where menu_id = p_menu_id loop
    insert into public.items (menu_id, name, description, position, created_at)
    values (v_menu_id, v_item.name, v_item.description, v_item.position, v_item.created_at)
    returning id into v_item_id;

    insert into public.ingredients (item_id, name, quantity, unit, created_at)
    select v_item_id, name, quantity, unit, created_at
    from public.ingredients where item_id = v_item.id;

    for v_group in select * from public.option_groups where item_id = v_item.id loop
      insert into public.option_groups (item_id, name, required, position)
      values (v_item_id, v_group.name, v_group.required, v_group.position)
      returning id into v_group_id;

      for v_choice in select * from public.option_choices where option_group_id = v_group.id loop
        insert into public.option_choices (option_group_id, name, position)
        values (v_group_id, v_choice.name, v_choice.position)
        returning id into v_choice_id;

        insert into public.ingredients (option_choice_id, name, quantity, unit, created_at)
        select v_choice_id, name, quantity, unit, created_at
        from public.ingredients where option_choice_id = v_choice.id;
      end loop;
    end loop;

    for v_addon in select * from public.addons where item_id = v_item.id loop
      insert into public.addons (item_id, name, position)
      values (v_item_id, v_addon.name, v_addon.position)
      returning id into v_addon_id;

      insert into public.ingredients (addon_id, name, quantity, unit, created_at)
      select v_addon_id, name, quantity, unit, created_at
      from public.ingredients where addon_id = v_addon.id;
    end loop;
  end loop;

  return v_menu_id;
end;
$$;

revoke execute on function public.copy_menu(uuid) from public, anon;
grant execute on function public.copy_menu(uuid) to authenticated;
