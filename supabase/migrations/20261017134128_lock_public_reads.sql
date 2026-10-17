-- Guests now read invites through get_invite (previous migration), so table
-- reads no longer need to be public. Apply only after the client uses the RPC.
-- Owner/collaborator select policies from the collaborators migration stay.

drop policy "brunches: public read once invites are sent" on public.brunches;
drop policy "brunch_date_options: public read once invites are sent" on public.brunch_date_options;
drop policy "menus: public read when used by a brunch" on public.menus;
drop policy "items: public read when used by a brunch" on public.items;
drop policy "option_groups: public read when used by a brunch" on public.option_groups;
drop policy "option_choices: public read when used by a brunch" on public.option_choices;
drop policy "addons: public read when used by a brunch" on public.addons;

drop function public.brunch_is_sent(uuid);
drop function public.menu_is_published(uuid);
drop function public.item_is_published(uuid);
drop function public.option_group_is_published(uuid);
