-- Guests read an invite through this RPC, by brunch id only. RLS can't tell a
-- list from a get-by-id, so the public-read table policies (dropped in the
-- follow-up migration) let anyone enumerate every sent brunch and menu.
--
-- Returns null for an unknown id and for a draft (invites_sent_at is null).
-- Ingredients are deliberately not part of it: host only.

create function public.get_invite(p_brunch_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'location', b.location,
    'scheduling', b.scheduling,
    'starts_at', b.starts_at,
    'invite_only', b.invite_only,
    'status', case
      when b.responses_close_at is not null and b.responses_close_at <= now() then 'closed'
      else 'open'
    end,
    'host_name', public.get_brunch_host_name(b.id),
    'cohost_names', to_jsonb(public.get_brunch_cohost_names(b.id)),
    'date_options', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'starts_at', o.starts_at) order by o.starts_at
      )
      from public.brunch_date_options o
      where o.brunch_id = b.id
    ), '[]'::jsonb),
    'menu', jsonb_build_object(
      'name', m.name,
      'description', m.description,
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'description', i.description,
            'option_groups', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', g.id,
                  'name', g.name,
                  'required', g.required,
                  'option_choices', coalesce((
                    select jsonb_agg(
                      jsonb_build_object('id', c.id, 'name', c.name) order by c.position
                    )
                    from public.option_choices c
                    where c.option_group_id = g.id
                  ), '[]'::jsonb)
                ) order by g.position
              )
              from public.option_groups g
              where g.item_id = i.id
            ), '[]'::jsonb),
            'addons', coalesce((
              select jsonb_agg(
                jsonb_build_object('id', a.id, 'name', a.name) order by a.position
              )
              from public.addons a
              where a.item_id = i.id
            ), '[]'::jsonb)
          ) order by i.position, i.created_at
        )
        from public.items i
        where i.menu_id = m.id
      ), '[]'::jsonb)
    )
  )
  from public.brunches b
  join public.menus m on m.id = b.menu_id
  where b.id = p_brunch_id and b.invites_sent_at is not null;
$$;

grant execute on function public.get_invite(uuid) to anon, authenticated;
