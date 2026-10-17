# Delegated agent workflow plan

## Roles

- **Orchestrator (main session, Sonnet):** owns scope, slices, briefs, and the review gates. Never writes feature code itself beyond trivial glue. Reads subagent receipts, checks the diff, and decides the next step.
- **Subagents:** each gets a self-contained brief (files/area, conventions from `AGENTS.md`, acceptance criteria, stop condition). One writer per set of files at a time.

## Model selection

| Task                                                                                                                                                      | Model            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Locate code, read-only recon, run `verify` and report, commit/push mechanics                                                                              | Haiku            |
| Plan + implement a feature slice (schemas, queries, forms, components, routes)                                                                            | Sonnet (default) |
| Cross-cutting end-to-end flow where DB, RLS, client and UI must agree and be debugged together (the invite/RSVP flow, `save_response` payload round trip) | Opus, only there |

## Per-slice pipeline

1. **Plan (Sonnet, read-only):** short slice plan from `AGENTS.md` + migrations: file list, shadcn components to add, query keys, schemas, routes.
2. **Implement (Sonnet):** follow the plan. Uses CLIs (`npm run ui:add`, `tsr generate`, `npm run supabase:types`) rather than hand-writing generated code.
3. **Verify (Haiku):** `npm run verify`; fix loop goes back to the implementer if red. Local Supabase must be up (`supabase status`), otherwise ask you to run `npm run supabase:start`.
4. **Self-test against local Supabase:** RLS/behaviour checks for the slice (e.g. host cannot read another host's menus; guest cannot read a draft brunch).
5. **Review gate (you):** dev server running, short "what to click" list, diff summary. I wait for your feedback on conventions, style, UX before continuing. Feedback gets folded into `AGENTS.md` or a memory so later slices inherit it.
6. **Commit + push (Haiku):** one conventional commit per slice (or a few), only after verify is green and you approve. Currently on `main`; I will ask whether to branch/PR per slice or push to `main` directly.

## Slices

### 1. Auth (login / registration)

- Supabase client session handling, auth query/mutations (`lib/queries/auth.ts`), zod + formOptions for login/register (with display name, picked up by the `handle_new_user` trigger).
- Route guard for host-only routes (`_authed` layout route), app shell with nav + logout, login/register screens in `features/auth`.
- Needs: shadcn `button input label card sonner`, email-confirmation setting decision for local dev.
- Model: Sonnet. Review gate: you register, log in, log out, get redirected.

### 2. Menu management

- `menuKeys` / `menuQueries` (list, detail with nested items → option groups → choices, add-ons, ingredients), mutations with invalidation.
- Menu list + editor in `features/menus`: items, option groups (radio semantics), choices, add-ons, ingredients attached to item / choice / add-on, positions.
- Biggest UI slice, so it may be split: (2a) menus + items, (2b) option groups/choices/add-ons, (2c) ingredients.
- Model: Sonnet per sub-slice. Review gate after 2a (the editor pattern sets the style for everything else) and after 2c.

### 3. Brunch management

- `brunchKeys` / `brunchQueries` against `brunches_with_status`; create/edit form (menu pick, fixed vs poll, location, `invite_only`, `responses_close_at`), poll slot editor, "Send invites" action (sets `invites_sent_at`), pick winning slot (sets `starts_at`).
- Host dashboard: list by status (draft / open / closed), brunch detail page with copyable invite link; invite-only guest management (add guest by name, copy per-guest link, see who has not responded).
- Model: Sonnet. Review gate: you create a draft, send it, see the link.

### 4. Invite / response flow

- Public routes `/invites/:brunchId` and `/invites/:brunchId/:responseId`, mobile-first, no auth.
- Guest form built on the `save_response` / `get_response` RPC payload (items with quantity, radio option groups, checkbox add-ons, date votes yes/maybe, notes), invite-only handling, closed and not-found states.
- Host side: responses view, aggregated shopping list (ingredients multiplied by quantity, including choice and add-on ingredients), poll tally.
- Model: Sonnet for UI; **Opus** for one end-to-end pass at the end (guest submits on phone viewport, host sees aggregated shopping list, RLS holds, edge cases like closed brunch, frozen poll, invite-only). This is the one place Opus is justified.

## Cross-cutting rules for every brief

- Follow `AGENTS.md` strictly: thin routes, central query keys, schema → form → mutation split, inferred types, no hand-edited `database.types.ts` or shadcn primitives.
- Comments only where non-obvious; rationale goes in `docs/`.
- No manual line wrapping in prose or commit messages.
- Subagents report a short receipt: files touched, commands run, verify result, open questions.

## Open decisions for you

1. Branching: push straight to `main` per slice, or a branch + PR per slice?
2. Local email confirmation: keep Supabase default (needs Inbucket) or disable confirmations in `config.toml` for dev?
3. Review gate format: dev server I start + click list, or also screenshots via the built-in browser?
