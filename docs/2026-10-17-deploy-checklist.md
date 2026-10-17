# Deploy checklist: Cloudflare Workers + hosted Supabase (acukzoboowdxsmtodqyp)

Live site: https://brunch-planner.moravrav.workers.dev

## 1. Cloudflare Workers

- Hosting is a Workers static-assets deployment configured in `wrangler.jsonc`: worker name `brunch-planner`, assets from `./dist`, `not_found_handling: "single-page-application"` (deep links such as `/invites/:id` fall back to `index.html`, so no redirects file is needed).
- Build with `npm run build` (`vite build`, output `dist`). The build does not run `tsc`, so the generated types are not needed. Do not use `npm run verify` as the build command.
- The client reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase/client.ts`). The hosted values are committed in `.env.production`, which Vite loads for `vite build` (`.env` is gitignored and points at 127.0.0.1). Both are public-safe and baked in at build time, so rebuild and redeploy after changing them. Never use the service_role key.
- Deploy: `npm run build`, then `npx wrangler deploy` (requires `npx wrangler login` once).

## 2. Supabase hosted

- Migrations to apply (9, all timestamped 20261017): `093947_profiles`, `093951_menus`, `093954_brunches`, `093958_responses`, `110248_reorder_items`, `112558_reorder_options`, `113512_add_ingredients_created_at`, `114028_optional_ingredient_name`, `114030_ingredient_unit_enum`. RLS policies are inside the migrations, as AGENTS.md requires.
- Push: `npx supabase login`, `npx supabase link --project-ref acukzoboowdxsmtodqyp` (prompts for the DB password), `npm run supabase:db:push` (use `npx supabase db push --dry-run` first). The memory note says the repo is already linked, but the link state lives in the untracked `supabase/.temp` and still needs a login and DB password on this machine. The CLI is pinned at 2.121.0.
- `supabase config push` is available (`npx supabase config --help` lists the `config` subcommand; verify with `npx supabase config push --help`). It would push the `config.toml` auth settings, but the current values are local-only, so edit them first or set them in the dashboard instead. Do not push as is:
  - `site_url = "http://127.0.0.1:3000"` and `additional_redirect_urls = ["https://127.0.0.1:3000"]`. Must become the Workers URL (Authentication > URL Configuration). Only matters for email links, since the code passes no `emailRedirectTo`.
  - `[auth.email] enable_confirmations = false`, so signup works instantly with no email. Hosted default is confirmations ON. Decide: turn off in dashboard (Authentication > Sign In / Providers > Email > Confirm email) for the fastest start, or keep on and handle the "check your email" flow (see `register-form.tsx`, which uses `data` from `signUp`).
  - `minimum_password_length = 6`, `enable_signup = true`. Match them in the dashboard if you care.
  - SMTP: none configured. Hosted uses Supabase's built-in SMTP.
  - `[auth.rate_limit] email_sent = 2` is a local config value; hosted built-in SMTP is limited to a few emails per hour per project and only sends to team members' addresses. Not an issue if confirmations stay off.
- No `supabase/seed.sql` exists (`db.seed` is enabled but the file is missing), so the hosted DB starts empty. This is fine.

## 3. Code assumptions

- No hardcoded localhost in `src`. Invite links use `window.location.origin` (`features/brunches/brunch-detail.tsx:86`, `features/invites/invite-page.tsx:94`), so they pick up the Workers domain automatically.
- Only localhost reference is the `.env` file (ignored) and `config.toml`.
- `routeTree.gen.ts` is modified but present; commit it, since the Vite router plugin regenerates it anyway.
- Working tree has uncommitted invite work (`src/features/invites/`, `src/routes/invites/`, `lib/queries/invites.ts`, ...). The Workers deploy uploads `dist`, so build locally first, so commit and push it, or the deploy lacks `/invites/:id`.

## 4. Risks

- RLS: the anon/publishable key is designed to be public, but safety depends entirely on the policies. Per AGENTS.md, brunches/date options are public select and responses are public insert. After pushing, sanity-check as anon that menus/responses are not readable (for example, `curl` the REST endpoint with the anon key).
- The `security definer` helper functions use `set search_path = ''`, which is good.
- Auth emails and rate limits only matter if email confirmation is on.
- `npm run supabase:types` needs a local stack or Docker; it is only needed for local `tsc`, never for the Workers build.

## Do these in order

1. (Agent) Commit the pending invite work and push to the remote.
2. (User) `npx supabase login`, then `npx supabase link --project-ref acukzoboowdxsmtodqyp` with the DB password.
3. (User, or agent after approval) `npx supabase db push --dry-run`, then `npm run supabase:db:push`.
4. (User) Supabase dashboard: copy the project URL and publishable key; decide on email confirm (off for fastest start).
5. (User) `npm run build`, then `npx wrangler deploy`.
6. (User) Supabase Authentication > URL Configuration: set Site URL to the Workers URL and add it to the redirect URLs.
7. (User) Smoke test: register, create a menu and brunch, open `/invites/:id` in a private window, submit an RSVP, and reload a deep link to confirm the SPA fallback.
