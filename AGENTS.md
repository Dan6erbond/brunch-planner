# AGENTS.md

Guidance for any agent (or human) working in this repo. Read this before adding
code — it defines where things live and why, so new work lands in the right
place without re-deriving conventions each time.

## What this app is

Brunch Planner: plan recurring brunches and know what to buy beforehand.

Core flow:

1. **Menus** are reusable. A menu has **items** (e.g. "Avocado Toast").
2. An item can have:
   - **Option groups** — single-choice picks, e.g. "Bread" → sourdough / rye / gluten-free.
   - **Add-ons** — multi-choice extras, e.g. "+ Scrambled Egg", "+ Poached Egg".
   - **Ingredients** — a plain list tied to the item, used to build the shopping list once RSVPs are in.
3. A **brunch** (event) picks one menu and has either a fixed date/time or a
   **date/time poll** (multiple candidate slots, guests vote).
4. Creating a brunch generates a public **invite** at `/invites/:id`. No login
   required to respond. Guests pick items/options/add-ons and optionally vote
   on date/time. Host reads responses back into an aggregated shopping list.

Auth (Supabase Auth) is only required for the **host** side: register/login,
create/edit menus, create brunches. The guest/invite side stays public for now.

## Tech stack & constraints

- **Hosting**: Netlify (static), **Supabase free tier** for DB/Auth/RLS. This
  means: no custom backend server, no server-side secrets beyond the public
  anon key. Everything talks to Supabase directly from the client.
- **Client-side only.** This repo is TanStack Router in `routerOnly` mode
  (see `.cta.json`) — there is no TanStack Start server. Don't add
  `createServerFn` / API routes; they don't fit the Netlify-static + Supabase
  model. All data access goes through the Supabase REST (PostgREST) or
  GraphQL API via `@supabase/supabase-js`.
- **Data**: TanStack Query for all server state. No ad-hoc `useEffect` fetches.
- **Forms**: TanStack Form + Zod, shared schemas between forms and mutations.
- **UI**: shadcn/ui on Tailwind v4. Use the CLI to add components; don't
  hand-write primitives that shadcn already provides.
- **Schema/security**: Supabase CLI migrations + RLS policies, checked into
  `supabase/migrations/`. The DB schema is never hand-edited in the dashboard
  and then forgotten — migrations are the source of truth.

## Folder structure

```
src/
  routes/                 # TanStack Router file-based routes (thin: loader + layout glue only)
  components/
    ui/                   # shadcn-generated primitives — regenerate via CLI, don't hand-edit beyond that
    layout/               # app shell, nav, invite-page shell — the one place hand-written layout lives
  features/
    menus/                # menu + item + option/add-on/ingredient UI, co-located with its own small hooks
    brunches/             # brunch creation, date/time poll UI
    invites/              # public invite page, RSVP form, shopping-list aggregation view
    auth/                 # login/register screens
  lib/
    supabase/
      client.ts           # single supabase-js client instance
      database.types.ts   # generated via `npm run supabase:types` — never hand-edit
    queries/               # TanStack Query registry (see below)
      keys.ts
      menus.ts
      brunches.ts
      invites.ts
    forms/                 # TanStack Form formOptions (see below)
      menu.form.ts
      brunch.form.ts
      rsvp.form.ts
    schemas/               # Zod schemas, shared by forms + query/mutation input validation
      menu.schema.ts
      brunch.schema.ts
      rsvp.schema.ts
    utils/
supabase/
  config.toml
  migrations/              # supabase CLI migrations, timestamped, one concern each
```

Rule of thumb: **routes stay thin**. A route file wires a `loader` to a
`queryOptions` call and renders a `features/*` component. Business/query/form
logic lives in `lib/` and `features/`, not inline in `src/routes/`.

## TanStack Query: central registry pattern

All query keys and query definitions live in `lib/queries/`, never inlined in
components. This is what makes cache invalidation predictable as the app
grows.

`lib/queries/keys.ts` — one key factory per entity, hierarchical so partial
invalidation works:

```ts
export const menuKeys = {
  all: ['menus'] as const,
  list: () => [...menuKeys.all, 'list'] as const,
  detail: (id: string) => [...menuKeys.all, 'detail', id] as const,
}

export const brunchKeys = {
  all: ['brunches'] as const,
  list: () => [...brunchKeys.all, 'list'] as const,
  detail: (id: string) => [...brunchKeys.all, 'detail', id] as const,
  responses: (id: string) => [...brunchKeys.detail(id), 'responses'] as const,
}
```

`lib/queries/menus.ts` — reusable `queryOptions()` per
[TanStack Query guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-options),
used identically from route loaders (`queryClient.ensureQueryData`) and from
components (`useSuspenseQuery` / `useQuery`):

```ts
import { queryOptions } from '@tanstack/react-query'
import { menuKeys } from './keys'
import { supabase } from '#/lib/supabase/client'

export const menuQueries = {
  list: () =>
    queryOptions({
      queryKey: menuKeys.list(),
      queryFn: async () => {
        const { data, error } = await supabase.from('menus').select('*')
        if (error) throw error
        return data
      },
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: menuKeys.detail(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('menus')
          .select('*, items(*, option_groups(*, option_choices(*)), addons(*), ingredients(*))')
          .eq('id', id)
          .single()
        if (error) throw error
        return data
      },
    }),
}
```

Mutations live next to the queries they invalidate (e.g.
`menuQueries.useCreate()` or a plain `useMutation` in the same file), and
invalidate via the same `menuKeys` factory — never a hand-typed key string.
This is the whole payoff of the registry: one place defines the key shape,
every invalidation call reuses it, nothing goes stale because a typo'd key
drifted from the query.

## TanStack Form: shared schemas + formOptions

Same split, mirrored:

- `lib/schemas/menu.schema.ts` — Zod schema, the single source of truth for
  shape + validation. Reused for form validation AND to validate
  mutation input before it hits Supabase.
- `lib/forms/menu.form.ts` — `formOptions()` built from that schema
  (default values, Zod validator adapter), imported by whatever component
  renders the form via `useForm(menuFormOptions)`.

```ts
// lib/schemas/menu.schema.ts
import { z } from 'zod'
export const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
export type MenuInput = z.infer<typeof menuSchema>
```

```ts
// lib/forms/menu.form.ts
import { formOptions } from '@tanstack/react-form'
import { menuSchema, type MenuInput } from '#/lib/schemas/menu.schema'

export const menuFormOptions = formOptions<MenuInput>({
  defaultValues: { name: '', description: '' },
  validators: { onChange: menuSchema },
})
```

Components call `useForm(menuFormOptions)` and submit into the matching
mutation from `lib/queries/menus.ts`. No validation logic or default-value
literals duplicated in the component.

## Supabase: schema, RLS, migrations

- Never hand-edit the schema via the Supabase dashboard and leave it
  undocumented — every change is a migration file, so the schema is
  reproducible from `supabase/migrations/` alone.
- RLS is on for every table from the first migration that creates it. Rough
  shape:
  - `profiles`, `menus`, `items`, `option_groups`, `option_choices`, `addons`,
    `ingredients`: owner-scoped (`auth.uid() = owner_id`) for
    select/insert/update/delete — only the host sees/edits their own menus.
  - `brunches`, `brunch_date_options`: owner-scoped for write, but
    **public select** (anyone with the invite id can read the brunch + menu +
    poll options to render `/invites/:id`).
  - `responses` / `response_selections` (guest RSVPs + picks):
    **public insert** (anyone with the link can respond), owner-scoped select
    (only the host aggregates results), no public update/delete — a guest
    submits once; resubmission/edit flows can come later if needed.
- Generate `lib/supabase/database.types.ts` from the live schema after every
  migration (script below) so the client stays type-safe without hand-typed
  row types drifting from reality.

## npm scripts to add

Wrap Supabase CLI and shadcn CLI calls as scripts so agents and humans run the
same reusable command instead of retyping flags:

```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:migration:new": "supabase migration new",
    "supabase:db:push": "supabase db push",
    "supabase:db:reset": "supabase db reset",
    "supabase:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts",
    "ui:add": "shadcn add"
  }
}
```

Usage: `npm run supabase:migration:new -- add_menus_table`,
`npm run ui:add -- button dialog`.

## Design direction (shadcn)

- Stick to shadcn defaults (neutral base theme, default radius) rather than
  inventing a custom design language — this is a tool for friends/family
  brunches, not a branded product. Consistency beats novelty here.
- The **invite page** (`/invites/:id`) is the one surface non-technical guests
  open cold, usually on a phone, often from a text link. Prioritize
  mobile-first layout, large tap targets for option/add-on selection, and a
  clear single "Submit" action. Everything else (host dashboard, menu editor)
  can be denser/desktop-oriented.
- Use shadcn's `calendar` + `popover`/`date-picker` composition for fixed
  date/time, and the same primitives repeated per-slot for date/time polls —
  don't build a custom date widget.
- Use shadcn `radio-group` for option groups (single choice, e.g. bread) and
  `checkbox`/`toggle-group` for add-ons (multi choice, e.g. extra egg) so the
  single-vs-multi distinction is visually obvious to guests.
- Favor `sonner` (toast) for mutation feedback, `dialog`/`sheet` for
  create/edit flows so hosts don't lose list context.
- Only write custom components for layout/composition
  (`components/layout/`, feature-level composition in `features/`). Anything
  that's a shadcn primitive, install it via `npm run ui:add` — don't
  hand-roll a button/input/select shadcn already ships.

## Local dev workflow

Normal working session: `npm run supabase:start` (or `supabase start` if
already running) + `npm run dev`, side by side. If a Supabase-dependent
command fails to connect (migrations, `supabase:types`, the app's queries
erroring on fetch) check whether the local stack is actually up
(`supabase status`) before debugging further — don't assume the code is
broken. If it's down, tell the user to run `npm run supabase:start` rather
than silently working around it.

## General guidance for agents working here

- Prefer CLI generation over hand-written boilerplate: `tsr generate` for
  routes, `shadcn add` for UI primitives, `supabase migration new` /
  `supabase gen types` for schema. If a CLI can produce it, don't write it by
  hand.
- Prefer `npm run <script>` over invoking `prettier`/`eslint`/`vite`/`supabase`
  directly — scripts in `package.json` are the contract; add a new script
  rather than running a one-off raw command, so the next agent gets the same
  shortcut.
- Keep the query/form/schema split strict: schema (shape+validation) →
  form (UI binding) and schema → query (fetch/mutate). Don't let a component
  define its own ad-hoc fetch, key, or validation — route it through
  `lib/queries/` or `lib/forms/`.
- Feature-slice `features/*` by domain (menus, brunches, invites, auth), not
  by technical layer — keeps related UI together as the app grows instead of
  spreading one feature across far-apart folders.
- Every new table needs: a migration, RLS policies in that same migration (not
  a follow-up "turn on RLS later" step), a regenerated `database.types.ts`,
  and a corresponding `lib/queries/*` entry before any component reads it.
