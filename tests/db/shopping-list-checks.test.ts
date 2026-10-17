import { beforeAll, describe, expect, it } from 'vitest'
import {
  anonClient,
  createBrunch,
  createMenu,
  createUser,
  must,
} from './helpers'
import type { TestUser } from './helpers'

describe('shopping_list_checks', () => {
  let owner: TestUser
  let coHost: TestUser
  let viewer: TestUser
  let stranger: TestUser
  let brunchId: string

  const keysOf = async (user: TestUser) =>
    must(
      await user.client
        .from('shopping_list_checks')
        .select('line_key')
        .eq('brunch_id', brunchId),
    ).map((row) => row.line_key)

  beforeAll(async () => {
    ;[owner, coHost, viewer, stranger] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])
    const fixture = await createMenu(owner)
    brunchId = (await createBrunch(owner, fixture.menu.id)).brunch.id
    for (const [user, role] of [
      [coHost, 'co_host'],
      [viewer, 'viewer'],
    ] as const) {
      const { error } = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: user.email,
        p_role: role,
      })
      expect(error).toBeNull()
    }
  })

  it.each([
    ['owner', () => owner],
    ['co-host', () => coHost],
  ])('lets the %s check and uncheck a line', async (_name, who) => {
    const user = who()
    const lineKey = `ing:milk|${user.id}`
    const checked = await user.client
      .from('shopping_list_checks')
      .insert({ brunch_id: brunchId, line_key: lineKey })
      .select()
      .single()
    expect(checked.error).toBeNull()
    expect(checked.data?.checked_by).toBe(user.id)
    expect(await keysOf(user)).toContain(lineKey)

    const removed = await user.client
      .from('shopping_list_checks')
      .delete()
      .eq('brunch_id', brunchId)
      .eq('line_key', lineKey)
      .select()
    expect(removed.error).toBeNull()
    expect(removed.data).toHaveLength(1)
    expect(await keysOf(user)).not.toContain(lineKey)
  })

  it('is idempotent when upserting with ignoreDuplicates', async () => {
    const row = { brunch_id: brunchId, line_key: 'ing:eggs|' }
    for (let i = 0; i < 2; i++) {
      const { error } = await owner.client
        .from('shopping_list_checks')
        .upsert(row, {
          onConflict: 'brunch_id,line_key',
          ignoreDuplicates: true,
        })
      expect(error).toBeNull()
    }
    expect(
      (await keysOf(owner)).filter((key) => key === row.line_key),
    ).toHaveLength(1)
  })

  it('reports a plain duplicate insert as a conflict', async () => {
    const row = { brunch_id: brunchId, line_key: 'ing:flour|' }
    must(await owner.client.from('shopping_list_checks').insert(row).select())
    const { error } = await coHost.client
      .from('shopping_list_checks')
      .insert(row)
    expect(error?.code).toBe('23505')
  })

  it('rejects a checked_by that is not the caller', async () => {
    const { error } = await owner.client.from('shopping_list_checks').insert({
      brunch_id: brunchId,
      line_key: 'ing:spoofed|',
      checked_by: coHost.id,
    })
    expect(error).not.toBeNull()
  })

  it('lets a viewer read but not check or uncheck', async () => {
    must(
      await owner.client
        .from('shopping_list_checks')
        .insert({ brunch_id: brunchId, line_key: 'ing:jam|' })
        .select(),
    )
    expect(await keysOf(viewer)).toContain('ing:jam|')

    const insert = await viewer.client
      .from('shopping_list_checks')
      .insert({ brunch_id: brunchId, line_key: 'ing:viewer|' })
    expect(insert.error).not.toBeNull()

    const removed = await viewer.client
      .from('shopping_list_checks')
      .delete()
      .eq('brunch_id', brunchId)
      .eq('line_key', 'ing:jam|')
      .select()
    expect(removed.data ?? []).toHaveLength(0)

    const keys = await keysOf(owner)
    expect(keys).toContain('ing:jam|')
    expect(keys).not.toContain('ing:viewer|')
  })

  it('hides checks from and blocks writes by a stranger', async () => {
    expect(await keysOf(stranger)).toEqual([])
    const insert = await stranger.client
      .from('shopping_list_checks')
      .insert({ brunch_id: brunchId, line_key: 'ing:stranger|' })
    expect(insert.error).not.toBeNull()
    const removed = await stranger.client
      .from('shopping_list_checks')
      .delete()
      .eq('brunch_id', brunchId)
      .select()
    expect(removed.data ?? []).toHaveLength(0)
    expect(await keysOf(owner)).toContain('ing:jam|')
  })

  it('gives anon no access', async () => {
    const anon = anonClient()
    const read = await anon.from('shopping_list_checks').select('line_key')
    expect(read.data ?? []).toEqual([])
    const insert = await anon
      .from('shopping_list_checks')
      .insert({ brunch_id: brunchId, line_key: 'ing:anon|' })
    expect(insert.error).not.toBeNull()
    expect(await keysOf(owner)).not.toContain('ing:anon|')
  })

  it('deletes checks with the brunch', async () => {
    const fixture = await createMenu(owner)
    const other = (await createBrunch(owner, fixture.menu.id)).brunch.id
    must(
      await owner.client
        .from('shopping_list_checks')
        .insert({ brunch_id: other, line_key: 'ing:gone|' })
        .select(),
    )
    must(await owner.client.from('brunches').delete().eq('id', other).select())
    const { data } = await owner.client
      .from('shopping_list_checks')
      .select('line_key')
      .eq('brunch_id', other)
    expect(data).toEqual([])
  })
})
