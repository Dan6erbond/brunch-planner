# Brunch Planner

Plan recurring brunches and know what to buy beforehand. A host builds reusable menus, creates brunches from them, shares an invite link, and reads the guests' responses back as an aggregated shopping list.

## Features

- Reusable menus with items; each item can have option groups (single choice, e.g. bread), add-ons (multi choice, e.g. extra egg) and an ingredient list.
- Brunches pick one menu and either a fixed date and time or a date and time poll that guests vote on.
- Public invite links at `/invites/:id`: no login for guests, mobile-first RSVP form, attend or decline.
- Invite-only brunches with a per-guest link.
- Aggregated shopping list built from the ingredients of everything guests picked.
- Sharing menus and brunches with collaborators and co-hosts, and copying a menu.
- Auth (Supabase Auth) is only needed on the host side.

## Tech stack

- Vite, React 19 and TypeScript, client-side only.
- TanStack Router in router-only mode (file-based routes, no TanStack Start server), TanStack Query for server state, TanStack Form with Zod schemas.
- shadcn/ui (Base UI) on Tailwind CSS v4.
- Supabase: Postgres, Auth and Row Level Security, accessed directly from the browser with `@supabase/supabase-js`.
- Hosting: Cloudflare Workers static assets (any static host with SPA fallback also works).

## Architecture

There is no custom backend. The browser talks to Supabase with the public publishable (anon) key, so security rests on the database.

- Hosts read and write their own data through tables protected by RLS policies.
- Guests never read tables directly. The public invite page and RSVP submission go through `security definer` RPC functions that expose only what an invite needs.
- The schema is defined solely by `supabase/migrations/`; RLS policies live in the same migration that creates a table.

```
src/
  routes/            TanStack Router file routes (thin: loader + layout glue)
  components/
    ui/              shadcn primitives (generated via CLI)
    form/            reusable field and form components for the app form hook
    layout/          app shell, nav, invite shell
  features/          domain UI: menus, brunches, invites, auth
  lib/
    supabase/        client.ts and generated database.types.ts
    queries/         TanStack Query key factories, queryOptions and mutations
    forms/           app form hook and formOptions
    schemas/         Zod schemas shared by forms and mutations
supabase/
  config.toml
  migrations/        timestamped SQL migrations
```

Conventions (query registry, form composition, type inference, migration rules) are documented in [AGENTS.md](AGENTS.md).

## Local development

Prerequisites: Node.js 22 (see `.node-version`), npm and Docker (the local Supabase stack runs in containers).

```bash
npm install
npm run supabase:start
cp .env.example .env
npm run supabase:status
npm run dev
```

1. `npm run supabase:start` starts the local Supabase stack and applies the migrations. It is safe to re-run.
2. Put the API URL and the publishable (anon) key printed by `npm run supabase:status` into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm run dev` serves the app at http://localhost:3000.

Local email confirmation is off (`enable_confirmations = false` in `supabase/config.toml`), so registering signs you in immediately. Mailpit (the local email inbox) is enabled at http://127.0.0.1:54324 if you turn confirmations on. Supabase Studio runs at http://127.0.0.1:54323.

Scripts:

| Script                                         | Purpose                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run verify`                               | Prettier check, ESLint and `tsc --noEmit`; run before committing                                      |
| `npm run format`                               | Prettier write and ESLint fix                                                                         |
| `npm run build` / `npm run preview`            | Production build and local preview                                                                    |
| `npm run supabase:migration:new -- <name>`     | Create a migration                                                                                    |
| `npm run supabase:migration:up:local`          | Apply pending migrations to the local DB                                                              |
| `npm run supabase:db:reset:local`              | Wipe and rebuild the local DB (destroys local data)                                                   |
| `npm run supabase:types`                       | Regenerate `src/lib/supabase/database.types.ts` from the local DB; commit the result after migrations |
| `npm run ui:add -- <component>`                | Add a shadcn component, then run `npm run format`                                                     |
| `npm run supabase:start` / `:stop` / `:status` | Manage the local stack                                                                                |
| `npm run generate-routes`                      | Regenerate the route tree                                                                             |

Use the `npm run supabase:*` scripts rather than a globally installed `supabase` binary; the CLI version is pinned in `package.json`.

## Self-hosting

1. Create a project at [supabase.com](https://supabase.com) (see the [docs](https://supabase.com/docs)). The free tier is enough.
2. Link and push the migrations:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npm run supabase:migration:up:remote
   ```

   `npm run supabase:migration:list` compares local and remote migrations. `link` prompts for the database password.

3. Configure Auth in the Supabase dashboard (Authentication):
   - Set the Site URL (URL Configuration) to your deployed app URL and add it to the redirect URLs. `supabase/config.toml` only contains local values (`http://127.0.0.1:3000`); do not push it as is.
   - Decide on email confirmation (Sign In / Providers, Email, Confirm email). The hosted default is on and uses Supabase's built-in SMTP, which is heavily rate limited; local development has it off.
4. Set the environment variables (read only at build time, baked into the bundle):

   | Variable                 | Value                                                                                     |
   | ------------------------ | ----------------------------------------------------------------------------------------- |
   | `VITE_SUPABASE_URL`      | Project URL from the Supabase dashboard                                                   |
   | `VITE_SUPABASE_ANON_KEY` | Publishable (anon) key. Public by design; never use the secret or `service_role` key here |

   Vite loads `.env.production` for `npm run build`; rebuild and redeploy after changing values.

5. Build and deploy:

   ```bash
   npm run build
   npx wrangler login
   npx wrangler deploy
   ```

   `wrangler.jsonc` serves `./dist` as Workers static assets with `not_found_handling: "single-page-application"`, so deep links such as `/invites/:id` fall back to `index.html`. Change the Worker `name` in `wrangler.jsonc` for your own deployment.

   Any other static host works too if it serves `dist/` with a fallback to `index.html` for unknown paths.

6. Smoke test: register, create a menu and a brunch, open the invite link in a private window, submit an RSVP, and reload a deep link.

Because the anon key is public, safety depends entirely on the RLS policies and RPCs in the migrations; do not edit the schema in the dashboard.

## Contributing

Read [AGENTS.md](AGENTS.md) first: it defines where code lives, the query and form conventions, and the migration rules. Run `npm run verify` and keep it green before opening a pull request.

## License

[MIT](LICENSE)
