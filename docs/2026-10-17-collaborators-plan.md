# Collaborators: sharing menus and brunches

Plan for letting a host share menus and brunches with other people. Decisions below were agreed with the user on 2026-10-17.

## Goals

- A host can add other signed-in users to a menu or a brunch with a limited role.
- Co-hosts of a brunch are visible to guests (shown in the invite header) and have advanced rights.
- Viewers can only look. They can never change anything.
- The guest/invite side stays public and unchanged apart from showing co-hosts.

## Data model

Two join tables, not one polymorphic table, so foreign keys and cascade deletes work and RLS stays simple.

- `menu_collaborators (menu_id, user_id, role, created_at)`, primary key `(menu_id, user_id)`, both FKs `on delete cascade` (`user_id` references `profiles`).
- `brunch_collaborators (brunch_id, user_id, role, created_at)`, same shape.
- Two Postgres enums, one per table, with UI labels as `Record<Enums<'x'>, string>` per AGENTS.md:
  - `menu_collaborator_role`: `viewer`, `editor`
  - `brunch_collaborator_role`: `viewer`, `co_host`
- `owner_id` stays the single owner. There is no `admin` role.

## Permission matrix

| Capability                                                          | Owner | Menu editor | Menu viewer | Co-host                   | Brunch viewer             |
| ------------------------------------------------------------------- | ----- | ----------- | ----------- | ------------------------- | ------------------------- |
| Read menu, items, ingredients                                       | yes   | yes         | yes         | yes (menu of that brunch) | yes (menu of that brunch) |
| Add/edit/delete items, option groups, choices, add-ons, ingredients | yes   | yes         | no          | no                        | no                        |
| Rename/edit the menu itself                                         | yes   | yes         | no          | no                        | no                        |
| Delete the menu                                                     | yes   | no          | no          | no                        | no                        |
| Manage menu collaborators                                           | yes   | no          | no          | no                        | no                        |
| Read brunch, responses, shopping list                               | yes   | no          | no          | yes                       | yes                       |
| Edit brunch, send invites, date poll, manage guests                 | yes   | no          | no          | yes                       | no                        |
| Delete the brunch                                                   | yes   | no          | no          | no                        | no                        |
| Manage brunch collaborators                                         | yes   | no          | no          | no                        | no                        |
| Leave a shared entity                                               | n/a   | yes         | yes         | yes                       | yes                       |

Notes:

- A menu editor can delete items (and everything under them). They cannot delete the menu or manage who has access.
- Brunch viewers see everything the host sees, read-only (guests tab, summary, shopping list). They get no edit, invite or poll controls.
- Reading a brunch's menu and ingredients is granted through the brunch collaborator row, so a co-host or viewer does not also need a menu collaborator row. Only non-draft brunches matter for this, but allowing it for drafts too is simpler and harmless.

## RLS and migration approach

Ownership checks already go through security-definer helpers in `supabase/migrations/20261017093951_menus.sql` (`owns_menu`, `owns_item`, `owns_option_group`, `owns_option_choice`, `owns_addon`) and `20261017093954_brunches.sql` plus `20261017093958_responses.sql` (brunch ownership checks on responses). Extend those, do not scatter new policies:

1. Add the enums and the two join tables, with RLS on from the start. Collaborators can read their own rows and the owner can manage all rows for their entity.
2. Add helpers: `can_read_menu`, `can_edit_menu`, `can_read_brunch`, `can_manage_brunch`. Keep them `security definer` with `set search_path` to avoid RLS recursion between entities and their collaborator tables.
3. Repoint the existing owner-only policies:
   - Select on menus and children uses `can_read_menu`.
   - Insert/update/delete on children uses `can_edit_menu`.
   - Update/delete of the menu row itself stays owner-only for delete, `can_edit_menu` for update.
   - Brunch select uses `can_read_brunch`, brunch update and date options use `can_manage_brunch`, brunch delete stays owner-only.
   - Responses and `response_*` select policies use `can_read_brunch`; host-side writes to responses use `can_manage_brunch`.
4. Regenerate `database.types.ts` with `npm run supabase:types` and commit it.
5. Never apply to the hosted project without explicit approval (`:remote` scripts need approval each time).

## Adding people: email lookup (chosen approach)

Simplest option and no token/claim route to build.

- Security-definer RPC `add_menu_collaborator(p_menu_id, p_email, p_role)` and `add_brunch_collaborator(p_brunch_id, p_email, p_role)`.
- The RPC checks the caller owns the entity, looks the email up in `auth.users`, inserts the collaborator row, and raises a clear error when no user has that email ("No account with that email") or when the user is the owner or already a collaborator.
- The lookup is only available to the owner of an entity through the RPC. Do not expose `auth.users` or an email column on `profiles`.
- Known trade-offs, accepted for a friends-and-family app: the invitee must already have an account, and the owner can learn whether an email is registered. If that becomes a problem, add a link/token flow later (`collaborator_invites` table plus a `claim_collaborator_invite(token)` RPC and a `/collaborate/$token` route).

## Co-hosts in the invite header

- The public invite page must show co-host display names next to the host. The host name already comes from an RPC (see `20261017120442_invite_host_name_and_save_response_default.sql`, which joins `profiles` on `owner_id`).
- Extend that RPC (or add one) to also return the brunch's co-host display names, using `profiles.display_name`. Viewers are not shown to guests. `profiles` stays private, so expose only display names through the security-definer function.

## UI

- "People" or "Share" dialog on the menu detail page and on the brunch detail page: list collaborators with role select, remove button, and an add-by-email form (`useAppForm`, Zod schema in `lib/schemas/`, mutation in `lib/queries/`).
- Role-based UI: hide or disable edit controls according to the caller's role. RLS is the real guard, the UI just avoids dead buttons. A small `useMenuRole(menuId)` / `useBrunchRole(brunchId)` helper that returns `owner | editor | viewer | co_host | none` keeps the checks out of components.
- Lists show "Shared with me" alongside owned menus and brunches. The queries need to return owned plus shared rows (RLS already filters) and the role.
- Collaborators can leave an entity; only the owner sees delete.
- Add TanStack Query keys for collaborator lists to `lib/queries/keys.ts` and invalidate through them.
- Invite page: render the host plus co-hosts in the header.

## Suggested slicing

1. Migration (tables, enums, helpers, policies, add/remove/leave RPCs), types regenerated, `npm run verify` green.
2. Menu sharing UI plus role-gated menu editing.
3. Brunch sharing UI, role-gated brunch detail, co-hosts in the invite header.
4. Hand the user a manual test list per slice, wait for their OK, then commit and push (standing approval for `origin main`).

## Out of scope

- Email delivery of invitations, link/token invites (possible follow-up).
- Ownership transfer.
- Per-guest invite-only links, decline UI and date polls (separate, already planned).
