# Open items (handoff)

State: `main` at `35aa870`, pushed, clean tree. Slices 1 to 4b are done (auth, menus/items, brunch management, public invite and RSVP, host responses view and shopping list).

## Working rules

- Work on `main`. After each slice: `npm run verify`, hand the user a manual test list, wait for their OK, then commit and push (standing approval to push to `origin main`).
- No browser use and no screenshots. The user verifies manually.
- Ask before adding non-shadcn libraries. shadcn components via `npm run ui:add` are fine.
- Hosted Supabase writes (`:remote` scripts, `config push`) need explicit approval each time. Always use `npm run supabase:*`, never a bare `supabase`.
- Follow `AGENTS.md` (query registry, `useAppForm`, Zod as source of truth, enums as Postgres enums, `#/` imports, thin routes). Sparse comments only.

## Next, in order

1. **Collaborators** (menus and brunches): full plan in [2026-10-17-collaborators-plan.md](2026-10-17-collaborators-plan.md). Decided: two join tables, two enums (`viewer`/`editor` for menus, `viewer`/`co_host` for brunches), menu editors may delete items but not the menu, add people by email through an owner-only RPC, co-hosts shown in the invite header, viewers read-only.
2. **Invite-only brunches**: per-guest links and guest management, reusing `/invites/$brunchId/$responseId`. Makes the "Waiting" status in the Guests tab testable.
3. **Decline UI** (open and invite-only): likely a response status column, a decline action in the RSVP form, a Guests tab badge. Today declined means submitted with zero items. See memory `project_decline_ui_todo.md`.
4. **Date polls**: slot editor, guest voting, winner pick, plus a `responses_close_at` UI.
5. Opus end-to-end pass: deferred ("then we'll see").

## Optional cleanups

- Rewrite the stale Netlify steps in the deploy checklist (hosting is Cloudflare Workers).
- `MenuCard` stretched-link hack.
- Disable past dates in the calendar.
- Move `ConfirmDeleteDialog` to `components/`.
- 6 `no-shadow` warnings in generated `calendar.tsx`.
- Unconfirmed: user's IDE `??` lint error in `responses-section.tsx`. `unitSymbol` was rewritten as a record as a best guess; ask the user if it persists.

## Reference

- Live site: https://brunch-planner.moravrav.workers.dev. Hosted Supabase project ref `acukzoboowdxsmtodqyp`.
- Response statuses today: attending = `responded_at` set with at least one item, declined = submitted with zero items, waiting = `responded_at` null.
- Shared helpers: `src/lib/date.ts`, `src/features/brunches/response-summary.ts`, `src/features/brunches/shopping-list.ts`.
