import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll } from 'vitest'
import type { Database, Tables } from '#/lib/supabase/database.types'

export type Db = SupabaseClient<Database>

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

/**
 * Connection settings, in order of preference:
 *   1. env vars SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   2. output of `npm run supabase:status -- -o env` (API_URL, ANON_KEY, SERVICE_ROLE_KEY)
 * Throws unless the URL host is 127.0.0.1 or localhost, so the suite can never
 * run against a hosted project.
 */
function loadConfig() {
  let url = process.env.SUPABASE_URL
  let anonKey = process.env.SUPABASE_ANON_KEY
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceKey) {
    let output: string
    try {
      output = execSync('npm run supabase:status -- -o env', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    } catch {
      throw new Error(
        'Local Supabase is not running. Start it with `npm run supabase:start`.',
      )
    }
    const status = new Map<string, string>()
    for (const line of output.split(/\r?\n/)) {
      const match = /^([A-Z_]+)="?([^"]*)"?$/.exec(line.trim())
      if (match?.[1]) {
        status.set(match[1], match[2])
      }
    }
    url ??= status.get('API_URL')
    anonKey ??= status.get('ANON_KEY')
    serviceKey ??= status.get('SERVICE_ROLE_KEY')
  }

  if (!url || !anonKey || !serviceKey) {
    throw new Error('Could not determine the local Supabase URL and keys.')
  }
  const { hostname } = new URL(url)
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to run DB tests against non-local host "${hostname}".`,
    )
  }
  return { url, anonKey, serviceKey }
}

const config = loadConfig()

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const

export function anonClient(): Db {
  return createClient<Database>(config.url, config.anonKey, clientOptions)
}

const admin = createClient<Database>(
  config.url,
  config.serviceKey,
  clientOptions,
)

const createdUserIds: string[] = []

afterAll(async () => {
  for (const id of createdUserIds.splice(0)) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw error
  }
})

export interface TestUser {
  id: string
  email: string
  displayName: string
  client: Db
}

export async function createUser(): Promise<TestUser> {
  const suffix = randomUUID()
  const email = `t-${suffix}@test.local`
  const displayName = `Tester ${suffix.slice(0, 8)}`
  const password = randomUUID()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  createdUserIds.push(data.user.id)

  const client = anonClient()
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) throw signedIn.error

  return { id: data.user.id, email, displayName, client }
}

/** Unwraps a Supabase response, throwing on error. */
export function must<T>(result: {
  data: T
  error: { message: string } | null
}): NonNullable<T> {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null || result.data === undefined) {
    throw new Error('expected data, got null')
  }
  return result.data
}

export interface MenuFixture {
  menu: Tables<'menus'>
  item: Tables<'items'>
  group: Tables<'option_groups'>
  choices: [Tables<'option_choices'>, Tables<'option_choices'>]
  addon: Tables<'addons'>
  ingredientName: string
}

/** One menu with one item that has a required option group (2 choices), an add-on and an ingredient. */
export async function createMenu(owner: TestUser): Promise<MenuFixture> {
  const db = owner.client
  const menu = must(
    await db.from('menus').insert({ name: 'Test menu' }).select().single(),
  )
  const item = must(
    await db
      .from('items')
      .insert({ menu_id: menu.id, name: 'Toast' })
      .select()
      .single(),
  )
  const group = must(
    await db
      .from('option_groups')
      .insert({ item_id: item.id, name: 'Bread', required: true })
      .select()
      .single(),
  )
  const created = must(
    await db
      .from('option_choices')
      .insert([
        { option_group_id: group.id, name: 'Sourdough', position: 0 },
        { option_group_id: group.id, name: 'Rye', position: 1 },
      ])
      .select()
      .order('position'),
  )
  const first = created.at(0)
  const second = created.at(1)
  if (!first || !second) throw new Error('choices not created')
  const addon = must(
    await db
      .from('addons')
      .insert({ item_id: item.id, name: 'Poached egg' })
      .select()
      .single(),
  )
  const ingredientName = `secret-ingredient-${randomUUID()}`
  must(
    await db
      .from('ingredients')
      .insert({ item_id: item.id, name: ingredientName })
      .select()
      .single(),
  )
  return { menu, item, group, choices: [first, second], addon, ingredientName }
}

export interface BrunchOptions {
  sent?: boolean
  inviteOnly?: boolean
  requireItems?: boolean
  poll?: boolean
  /** Poll slots to add (only with `poll`). */
  slots?: string[]
}

export async function createBrunch(
  owner: TestUser,
  menuId: string,
  options: BrunchOptions = {},
) {
  const db = owner.client
  const {
    sent = true,
    inviteOnly = false,
    requireItems = false,
    poll = false,
  } = options
  const brunch = must(
    await db
      .from('brunches')
      .insert({
        menu_id: menuId,
        title: 'Test brunch',
        invite_only: inviteOnly,
        require_items: requireItems,
        scheduling: poll ? 'poll' : 'fixed',
        starts_at: poll ? null : '2030-01-01T10:00:00Z',
      })
      .select()
      .single(),
  )
  const slots = options.slots ?? [
    '2030-02-01T10:00:00Z',
    '2030-02-02T10:00:00Z',
  ]
  let dateOptions: Tables<'brunch_date_options'>[] = []
  if (poll && slots.length > 0) {
    dateOptions = must(
      await db
        .from('brunch_date_options')
        .insert(slots.map((starts_at) => ({ brunch_id: brunch.id, starts_at })))
        .select()
        .order('starts_at'),
    )
  }
  if (sent) {
    must(
      await db
        .from('brunches')
        .update({ invites_sent_at: new Date().toISOString() })
        .eq('id', brunch.id)
        .select()
        .single(),
    )
  }
  return { brunch, dateOptions }
}
