import { beforeAll, describe, expect, it } from 'vitest'
import { createBrunch, createMenu, createUser, must } from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('brunch RBAC', () => {
  let owner: TestUser
  let stranger: TestUser
  let viewer: TestUser
  let coHost: TestUser
  let fixture: MenuFixture
  let brunchId: string

  beforeAll(async () => {
    ;[owner, stranger, viewer, coHost] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])
    fixture = await createMenu(owner)
    brunchId = (await createBrunch(owner, fixture.menu.id)).brunch.id
    for (const [user, role] of [
      [viewer, 'viewer'],
      [coHost, 'co_host'],
    ] as const) {
      const { error } = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: user.email,
        p_role: role,
      })
      expect(error).toBeNull()
    }
  })

  it('owner reads and edits the brunch', async () => {
    const updated = must(
      await owner.client
        .from('brunches')
        .update({ title: 'Owner title' })
        .eq('id', brunchId)
        .select()
        .single(),
    )
    expect(updated.title).toBe('Owner title')
  })

  it('cannot create a brunch on a menu the user does not own', async () => {
    const { error } = await stranger.client.from('brunches').insert({
      menu_id: fixture.menu.id,
      title: 'Stolen menu',
      starts_at: '2030-01-01T10:00:00Z',
    })
    expect(error).not.toBeNull()
  })

  it('a stranger cannot read or touch the brunch, even once invites are sent', async () => {
    const { client } = stranger
    const read = await client
      .from('brunches')
      .select()
      .eq('id', brunchId)
      .maybeSingle()
    expect(read.data).toBeNull()

    const update = await client
      .from('brunches')
      .update({ title: 'Hacked' })
      .eq('id', brunchId)
      .select()
    expect(update.data).toEqual([])

    const del = await client
      .from('brunches')
      .delete()
      .eq('id', brunchId)
      .select()
    expect(del.data).toEqual([])

    const guest = await client
      .from('responses')
      .insert({ brunch_id: brunchId, guest_name: 'Sneaky' })
    expect(guest.error).not.toBeNull()
  })

  it('a draft brunch is invisible to a stranger', async () => {
    const draft = await createBrunch(owner, fixture.menu.id, { sent: false })
    const read = await stranger.client
      .from('brunches')
      .select()
      .eq('id', draft.brunch.id)
      .maybeSingle()
    expect(read.data).toBeNull()
  })

  describe('co_host', () => {
    it('reads the brunch and its menu', async () => {
      const brunch = await coHost.client
        .from('brunches')
        .select()
        .eq('id', brunchId)
        .maybeSingle()
      expect(brunch.data).not.toBeNull()
      const menu = await coHost.client
        .from('menus')
        .select()
        .eq('id', fixture.menu.id)
        .maybeSingle()
      expect(menu.data).not.toBeNull()
    })

    it('manages the brunch: update and add guests', async () => {
      const updated = must(
        await coHost.client
          .from('brunches')
          .update({ location: 'Co-host place' })
          .eq('id', brunchId)
          .select()
          .single(),
      )
      expect(updated.location).toBe('Co-host place')

      const guest = must(
        await coHost.client
          .from('responses')
          .insert({ brunch_id: brunchId, guest_name: 'Added by co-host' })
          .select()
          .single(),
      )
      expect(guest.brunch_id).toBe(brunchId)
    })

    it('cannot delete the brunch, change the owner, or share it', async () => {
      const del = await coHost.client
        .from('brunches')
        .delete()
        .eq('id', brunchId)
        .select()
      expect(del.data).toEqual([])

      const ownerChange = await coHost.client
        .from('brunches')
        .update({ owner_id: coHost.id })
        .eq('id', brunchId)
      expect(ownerChange.error?.message).toMatch(/owner cannot be changed/)

      const add = await coHost.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: stranger.email,
        p_role: 'co_host',
      })
      expect(add.error?.message).toMatch(/Only the owner can share this brunch/)

      const stillThere = await owner.client
        .from('brunches')
        .select()
        .eq('id', brunchId)
        .maybeSingle()
      expect(stillThere.data).not.toBeNull()
    })
  })

  describe('viewer', () => {
    it('reads the brunch and its guests but cannot write', async () => {
      const { client } = viewer
      const brunch = await client
        .from('brunches')
        .select()
        .eq('id', brunchId)
        .maybeSingle()
      expect(brunch.data).not.toBeNull()

      const responses = await client
        .from('responses')
        .select()
        .eq('brunch_id', brunchId)
      expect(responses.error).toBeNull()

      const update = await client
        .from('brunches')
        .update({ title: 'Hacked' })
        .eq('id', brunchId)
        .select()
      expect(update.data).toEqual([])

      const del = await client
        .from('brunches')
        .delete()
        .eq('id', brunchId)
        .select()
      expect(del.data).toEqual([])

      const guest = await client
        .from('responses')
        .insert({ brunch_id: brunchId, guest_name: 'Viewer guest' })
      expect(guest.error).not.toBeNull()
    })

    it('reads the menu through the brunch but cannot edit it', async () => {
      const menu = await viewer.client
        .from('menus')
        .select()
        .eq('id', fixture.menu.id)
        .maybeSingle()
      expect(menu.data).not.toBeNull()
      const update = await viewer.client
        .from('menus')
        .update({ name: 'Hacked' })
        .eq('id', fixture.menu.id)
        .select()
      expect(update.data).toEqual([])
    })
  })

  it('my_brunch_role reports the caller role', async () => {
    const role = async (user: TestUser) =>
      (await user.client.rpc('my_brunch_role', { p_brunch_id: brunchId })).data
    expect(await role(owner)).toBe('owner')
    expect(await role(viewer)).toBe('viewer')
    expect(await role(coHost)).toBe('co_host')
    expect(await role(stranger)).toBe('none')
  })

  it('owner can delete the brunch', async () => {
    const { brunch } = await createBrunch(owner, fixture.menu.id)
    const deleted = must(
      await owner.client.from('brunches').delete().eq('id', brunch.id).select(),
    )
    expect(deleted).toHaveLength(1)
  })
})
