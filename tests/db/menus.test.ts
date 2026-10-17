import { beforeAll, describe, expect, it } from 'vitest'
import { createMenu, createUser, must } from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('menu RBAC', () => {
  let owner: TestUser
  let stranger: TestUser
  let viewer: TestUser
  let editor: TestUser
  let fixture: MenuFixture

  beforeAll(async () => {
    ;[owner, stranger, viewer, editor] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])
    fixture = await createMenu(owner)
    for (const [user, role] of [
      [viewer, 'viewer'],
      [editor, 'editor'],
    ] as const) {
      const { error } = await owner.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: user.email,
        p_role: role,
      })
      expect(error).toBeNull()
    }
  })

  it('owner reads the menu with all children, including ingredients', async () => {
    const menu = must(
      await owner.client
        .from('menus')
        .select(
          '*, items(*, option_groups(*, option_choices(*)), addons(*), ingredients(*))',
        )
        .eq('id', fixture.menu.id)
        .single(),
    )
    expect(menu.items).toHaveLength(1)
    expect(menu.items[0]?.option_groups[0]?.option_choices).toHaveLength(2)
    expect(menu.items[0]?.addons).toHaveLength(1)
    expect(menu.items[0]?.ingredients[0]?.name).toBe(fixture.ingredientName)
  })

  it('owner edits and deletes their menu', async () => {
    const own = await createMenu(owner)
    const renamed = must(
      await owner.client
        .from('menus')
        .update({ name: 'Renamed' })
        .eq('id', own.menu.id)
        .select()
        .single(),
    )
    expect(renamed.name).toBe('Renamed')

    const deleted = must(
      await owner.client.from('menus').delete().eq('id', own.menu.id).select(),
    )
    expect(deleted).toHaveLength(1)
  })

  it('a stranger cannot read the menu or any of its children', async () => {
    const { client } = stranger
    const menu = await client
      .from('menus')
      .select()
      .eq('id', fixture.menu.id)
      .maybeSingle()
    expect(menu.data).toBeNull()

    const reads = {
      items: client.from('items').select().eq('menu_id', fixture.menu.id),
      option_groups: client
        .from('option_groups')
        .select()
        .eq('item_id', fixture.item.id),
      option_choices: client
        .from('option_choices')
        .select()
        .eq('option_group_id', fixture.group.id),
      addons: client.from('addons').select().eq('item_id', fixture.item.id),
      ingredients: client
        .from('ingredients')
        .select()
        .eq('item_id', fixture.item.id),
    }
    for (const [table, query] of Object.entries(reads)) {
      const { data, error } = await query
      expect(error).toBeNull()
      expect(data, table).toEqual([])
    }
  })

  it('a stranger cannot edit, delete or add items to the menu', async () => {
    const { client } = stranger
    const update = await client
      .from('menus')
      .update({ name: 'Hacked' })
      .eq('id', fixture.menu.id)
      .select()
    expect(update.data).toEqual([])

    const del = await client
      .from('menus')
      .delete()
      .eq('id', fixture.menu.id)
      .select()
    expect(del.data).toEqual([])

    const insert = await client
      .from('items')
      .insert({ menu_id: fixture.menu.id, name: 'Sneaky' })
    expect(insert.error).not.toBeNull()

    const reloaded = must(
      await owner.client
        .from('menus')
        .select()
        .eq('id', fixture.menu.id)
        .single(),
    )
    expect(reloaded.name).toBe(fixture.menu.name)
  })

  it('a user cannot create a menu owned by someone else', async () => {
    const { error } = await stranger.client
      .from('menus')
      .insert({ name: 'Forged', owner_id: owner.id })
    expect(error).not.toBeNull()
  })

  describe('viewer', () => {
    it('reads the menu, its items and ingredients', async () => {
      const menu = must(
        await viewer.client
          .from('menus')
          .select('*, items(*, ingredients(*))')
          .eq('id', fixture.menu.id)
          .single(),
      )
      expect(menu.items).toHaveLength(1)
      expect(menu.items[0]?.ingredients).toHaveLength(1)
    })

    it('cannot edit the menu or write items', async () => {
      const { client } = viewer
      const update = await client
        .from('menus')
        .update({ name: 'Hacked' })
        .eq('id', fixture.menu.id)
        .select()
      expect(update.data).toEqual([])

      const itemUpdate = await client
        .from('items')
        .update({ name: 'Hacked' })
        .eq('id', fixture.item.id)
        .select()
      expect(itemUpdate.data).toEqual([])

      const insert = await client
        .from('items')
        .insert({ menu_id: fixture.menu.id, name: 'Nope' })
      expect(insert.error).not.toBeNull()

      const del = await client
        .from('menus')
        .delete()
        .eq('id', fixture.menu.id)
        .select()
      expect(del.data).toEqual([])
    })

    it('has the viewer role', async () => {
      const { data } = await viewer.client.rpc('my_menu_role', {
        p_menu_id: fixture.menu.id,
      })
      expect(data).toBe('viewer')
    })
  })

  describe('editor', () => {
    it('edits the menu and its content', async () => {
      const { client } = editor
      const renamed = must(
        await client
          .from('menus')
          .update({ description: 'edited by editor' })
          .eq('id', fixture.menu.id)
          .select()
          .single(),
      )
      expect(renamed.description).toBe('edited by editor')

      const item = must(
        await client
          .from('items')
          .insert({ menu_id: fixture.menu.id, name: 'Editor item' })
          .select()
          .single(),
      )
      expect(item.menu_id).toBe(fixture.menu.id)

      const addon = must(
        await client
          .from('addons')
          .insert({ item_id: item.id, name: 'Extra' })
          .select()
          .single(),
      )
      expect(addon.item_id).toBe(item.id)

      const removed = must(
        await client.from('items').delete().eq('id', item.id).select(),
      )
      expect(removed).toHaveLength(1)
    })

    it('cannot delete the menu', async () => {
      const del = await editor.client
        .from('menus')
        .delete()
        .eq('id', fixture.menu.id)
        .select()
      expect(del.data).toEqual([])
      const still = await owner.client
        .from('menus')
        .select()
        .eq('id', fixture.menu.id)
        .maybeSingle()
      expect(still.data).not.toBeNull()
    })

    it('cannot change the owner', async () => {
      const { error } = await editor.client
        .from('menus')
        .update({ owner_id: editor.id })
        .eq('id', fixture.menu.id)
      expect(error?.message).toMatch(/owner cannot be changed/)
    })

    it('cannot manage collaborators', async () => {
      const add = await editor.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: stranger.email,
        p_role: 'editor',
      })
      expect(add.error?.message).toMatch(/Only the owner can share this menu/)

      const list = await editor.client.rpc('list_menu_collaborators', {
        p_menu_id: fixture.menu.id,
      })
      expect(list.error?.message).toMatch(/Only the owner/)

      const promote = await editor.client
        .from('menu_collaborators')
        .update({ role: 'editor' })
        .eq('menu_id', fixture.menu.id)
        .eq('user_id', viewer.id)
        .select()
      expect(promote.data).toEqual([])
    })
  })

  it('a collaborator can leave, and then loses access', async () => {
    const leaver = await createUser()
    const added = await owner.client.rpc('add_menu_collaborator', {
      p_menu_id: fixture.menu.id,
      p_email: leaver.email,
      p_role: 'viewer',
    })
    expect(added.error).toBeNull()
    const left = await leaver.client
      .from('menu_collaborators')
      .delete()
      .eq('menu_id', fixture.menu.id)
      .eq('user_id', leaver.id)
      .select()
    expect(left.data).toHaveLength(1)
    const menu = await leaver.client
      .from('menus')
      .select()
      .eq('id', fixture.menu.id)
      .maybeSingle()
    expect(menu.data).toBeNull()
  })

  it('copy_menu deep-copies a readable menu for the caller only', async () => {
    const copyId = must(
      await viewer.client.rpc('copy_menu', { p_menu_id: fixture.menu.id }),
    )
    const copy = must(
      await viewer.client
        .from('menus')
        .select('*, items(*, option_groups(*, option_choices(*)), addons(*))')
        .eq('id', copyId)
        .single(),
    )
    expect(copy.owner_id).toBe(viewer.id)
    expect(copy.name).toBe(`Copy of ${fixture.menu.name}`)
    expect(copy.items.length).toBeGreaterThanOrEqual(1)
    expect(copy.items[0]?.option_groups[0]?.option_choices).toHaveLength(2)

    const denied = await stranger.client.rpc('copy_menu', {
      p_menu_id: fixture.menu.id,
    })
    expect(denied.error?.message).toMatch(/not found or not accessible/)
  })

  it('reorder_items updates positions for the owner and is a no-op for a stranger', async () => {
    const own = await createMenu(owner)
    const second = must(
      await owner.client
        .from('items')
        .insert({ menu_id: own.menu.id, name: 'Second', position: 5 })
        .select()
        .single(),
    )
    const order = [second.id, own.item.id]

    const strangerReorder = await stranger.client.rpc('reorder_items', {
      p_menu_id: own.menu.id,
      p_item_ids: order,
    })
    expect(strangerReorder.error).toBeNull()
    const unchanged = must(
      await owner.client
        .from('items')
        .select('id, position')
        .eq('id', second.id)
        .single(),
    )
    expect(unchanged.position).toBe(5)

    const reorder = await owner.client.rpc('reorder_items', {
      p_menu_id: own.menu.id,
      p_item_ids: order,
    })
    expect(reorder.error).toBeNull()
    const items = must(
      await owner.client.from('items').select('id, position').in('id', order),
    )
    expect(items.find((i) => i.id === second.id)?.position).toBe(0)
    expect(items.find((i) => i.id === own.item.id)?.position).toBe(1)
  })
})
