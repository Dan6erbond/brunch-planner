import { beforeAll, describe, expect, it } from 'vitest'
import { anonClient, createBrunch, createMenu, createUser } from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('collaborator RPCs', () => {
  let owner: TestUser
  let other: TestUser
  let fixture: MenuFixture
  let brunchId: string

  beforeAll(async () => {
    ;[owner, other] = await Promise.all([createUser(), createUser()])
    fixture = await createMenu(owner)
    brunchId = (await createBrunch(owner, fixture.menu.id)).brunch.id
  })

  describe('add_menu_collaborator', () => {
    it('adds by email, case-insensitively and trimmed', async () => {
      const { error } = await owner.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: `  ${other.email.toUpperCase()} `,
        p_role: 'viewer',
      })
      expect(error).toBeNull()

      const { data } = await owner.client.rpc('list_menu_collaborators', {
        p_menu_id: fixture.menu.id,
      })
      expect(data).toEqual([
        {
          user_id: other.id,
          display_name: other.displayName,
          email: other.email,
          role: 'viewer',
        },
      ])
    })

    it('rejects an unknown email', async () => {
      const { error } = await owner.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: `nobody-${crypto.randomUUID()}@test.local`,
        p_role: 'viewer',
      })
      expect(error?.message).toMatch(/No account with that email/)
    })

    it('rejects adding the owner and duplicates', async () => {
      const self = await owner.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: owner.email,
        p_role: 'editor',
      })
      expect(self.error?.message).toMatch(/already own this menu/)

      const duplicate = await owner.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: other.email,
        p_role: 'editor',
      })
      expect(duplicate.error?.message).toMatch(/Already a collaborator/)
    })

    it('is owner-only, even for a user who owns nothing here', async () => {
      const { error } = await other.client.rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: owner.email,
        p_role: 'editor',
      })
      expect(error?.message).toMatch(/Only the owner can share this menu/)
    })

    it('is not callable anonymously', async () => {
      const { error } = await anonClient().rpc('add_menu_collaborator', {
        p_menu_id: fixture.menu.id,
        p_email: other.email,
        p_role: 'editor',
      })
      expect(error).not.toBeNull()
    })

    it('the owner can change a role and remove a collaborator', async () => {
      const role = await owner.client
        .from('menu_collaborators')
        .update({ role: 'editor' })
        .eq('menu_id', fixture.menu.id)
        .eq('user_id', other.id)
        .select()
      expect(role.data).toHaveLength(1)
      expect(
        (
          await other.client.rpc('my_menu_role', {
            p_menu_id: fixture.menu.id,
          })
        ).data,
      ).toBe('editor')

      const removed = await owner.client
        .from('menu_collaborators')
        .delete()
        .eq('menu_id', fixture.menu.id)
        .eq('user_id', other.id)
        .select()
      expect(removed.data).toHaveLength(1)
      expect(
        (
          await other.client.rpc('my_menu_role', {
            p_menu_id: fixture.menu.id,
          })
        ).data,
      ).toBe('none')
    })
  })

  describe('add_brunch_collaborator', () => {
    it('adds by email and lists for the owner only', async () => {
      const { error } = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: other.email,
        p_role: 'co_host',
      })
      expect(error).toBeNull()

      const { data } = await owner.client.rpc('list_brunch_collaborators', {
        p_brunch_id: brunchId,
      })
      expect(data).toEqual([
        {
          user_id: other.id,
          display_name: other.displayName,
          email: other.email,
          role: 'co_host',
        },
      ])

      const asCollaborator = await other.client.rpc(
        'list_brunch_collaborators',
        { p_brunch_id: brunchId },
      )
      expect(asCollaborator.error?.message).toMatch(/Only the owner/)
    })

    it('rejects an unknown email, the owner and duplicates', async () => {
      const unknown = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: `nobody-${crypto.randomUUID()}@test.local`,
        p_role: 'viewer',
      })
      expect(unknown.error?.message).toMatch(/No account with that email/)

      const self = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: owner.email,
        p_role: 'viewer',
      })
      expect(self.error?.message).toMatch(/already own this brunch/)

      const duplicate = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: other.email,
        p_role: 'viewer',
      })
      expect(duplicate.error?.message).toMatch(/Already a collaborator/)
    })

    it('is owner-only, even for a co-host', async () => {
      const third = await createUser()
      const { error } = await other.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: third.email,
        p_role: 'viewer',
      })
      expect(error?.message).toMatch(/Only the owner can share this brunch/)
    })

    it('exposes co-host names (not viewers) on the public invite', async () => {
      const viewer = await createUser()
      await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: viewer.email,
        p_role: 'viewer',
      })
      const { data } = await anonClient().rpc('get_invite', {
        p_brunch_id: brunchId,
      })
      expect(data).toMatchObject({ cohost_names: [other.displayName] })
      expect(JSON.stringify(data)).not.toContain(viewer.displayName)
    })
  })
})
