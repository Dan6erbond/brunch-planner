import { beforeAll, describe, expect, it } from 'vitest'
import {
  anonClient,
  createBrunch,
  createMenu,
  createUser,
  must,
} from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('public invite and guest RSVP', () => {
  let owner: TestUser
  let fixture: MenuFixture
  let openBrunchId: string
  const guest = anonClient()

  const attendingPayload = (quantity = 2) => ({
    guest_name: 'Sam',
    notes: 'No nuts',
    status: 'attending',
    items: [
      {
        item_id: fixture.item.id,
        quantity,
        option_choice_ids: [fixture.choices[0].id],
        addon_ids: [fixture.addon.id],
      },
    ],
  })

  const readResponse = async (responseId: string) =>
    must(
      await owner.client
        .from('responses')
        .select(
          '*, response_items(*, response_item_choices(*), response_item_addons(*))',
        )
        .eq('id', responseId)
        .single(),
    )

  beforeAll(async () => {
    owner = await createUser()
    fixture = await createMenu(owner)
    openBrunchId = (await createBrunch(owner, fixture.menu.id)).brunch.id
  })

  describe('anon access to tables', () => {
    it('cannot select brunches, menus, items or responses directly', async () => {
      const saved = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: attendingPayload(),
        }),
      )

      const reads = {
        brunches: guest.from('brunches').select().eq('id', openBrunchId),
        menus: guest.from('menus').select().eq('id', fixture.menu.id),
        items: guest.from('items').select().eq('menu_id', fixture.menu.id),
        option_groups: guest
          .from('option_groups')
          .select()
          .eq('item_id', fixture.item.id),
        option_choices: guest
          .from('option_choices')
          .select()
          .eq('option_group_id', fixture.group.id),
        addons: guest.from('addons').select().eq('item_id', fixture.item.id),
        ingredients: guest
          .from('ingredients')
          .select()
          .eq('item_id', fixture.item.id),
        responses: guest
          .from('responses')
          .select()
          .eq('brunch_id', openBrunchId),
        response_items: guest
          .from('response_items')
          .select()
          .eq('response_id', saved),
        brunch_date_options: guest
          .from('brunch_date_options')
          .select()
          .eq('brunch_id', openBrunchId),
        profiles: guest.from('profiles').select().eq('id', owner.id),
      }
      for (const [table, query] of Object.entries(reads)) {
        const { data, error } = await query
        expect(error, table).toBeNull()
        expect(data, table).toEqual([])
      }
    })

    it('cannot write to any table', async () => {
      const insert = await guest
        .from('responses')
        .insert({ brunch_id: openBrunchId, guest_name: 'Direct' })
      expect(insert.error).not.toBeNull()

      const update = await guest
        .from('brunches')
        .update({ title: 'Hacked' })
        .eq('id', openBrunchId)
        .select()
      expect(update.data ?? []).toEqual([])
    })

    it('cannot call host-only RPCs', async () => {
      const copy = await guest.rpc('copy_menu', { p_menu_id: fixture.menu.id })
      expect(copy.error).not.toBeNull()
      const role = await guest.rpc('my_brunch_role', {
        p_brunch_id: openBrunchId,
      })
      expect(role.error).not.toBeNull()
    })
  })

  describe('get_invite', () => {
    it('returns the invite for an open brunch, without ingredients', async () => {
      const { data, error } = await guest.rpc('get_invite', {
        p_brunch_id: openBrunchId,
      })
      expect(error).toBeNull()
      expect(data).toMatchObject({
        id: openBrunchId,
        title: 'Test brunch',
        invite_only: false,
        status: 'open',
        host_name: owner.displayName,
        menu: {
          name: fixture.menu.name,
          items: [
            {
              id: fixture.item.id,
              option_groups: [
                {
                  id: fixture.group.id,
                  required: true,
                  option_choices: [
                    { id: fixture.choices[0].id },
                    { id: fixture.choices[1].id },
                  ],
                },
              ],
              addons: [{ id: fixture.addon.id }],
            },
          ],
        },
      })
      expect(JSON.stringify(data)).not.toContain(fixture.ingredientName)
    })

    it('returns null for a draft brunch and for an unknown id', async () => {
      const draft = await createBrunch(owner, fixture.menu.id, { sent: false })
      const draftInvite = await guest.rpc('get_invite', {
        p_brunch_id: draft.brunch.id,
      })
      expect(draftInvite.error).toBeNull()
      expect(draftInvite.data).toBeNull()

      const unknown = await guest.rpc('get_invite', {
        p_brunch_id: crypto.randomUUID(),
      })
      expect(unknown.data).toBeNull()
    })

    it('reports status closed once responses_close_at has passed', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id)
      must(
        await owner.client
          .from('brunches')
          .update({ responses_close_at: '2020-01-01T00:00:00Z' })
          .eq('id', brunch.id)
          .select()
          .single(),
      )
      const { data } = await guest.rpc('get_invite', { p_brunch_id: brunch.id })
      expect(data).toMatchObject({ status: 'closed' })
    })

    it('invite-only: locked stub without a valid response id, full invite with one', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id, {
        inviteOnly: true,
      })
      const response = must(
        await owner.client
          .from('responses')
          .insert({ brunch_id: brunch.id, guest_name: 'Invited guest' })
          .select()
          .single(),
      )
      const otherBrunch = await createBrunch(owner, fixture.menu.id, {
        inviteOnly: true,
      })

      const withoutId = await guest.rpc('get_invite', {
        p_brunch_id: brunch.id,
      })
      expect(withoutId.data).toEqual({
        id: brunch.id,
        invite_only: true,
        locked: true,
      })

      const wrongId = await guest.rpc('get_invite', {
        p_brunch_id: brunch.id,
        p_response_id: crypto.randomUUID(),
      })
      expect(wrongId.data).toMatchObject({ locked: true })

      const otherBrunchResponse = await guest.rpc('get_invite', {
        p_brunch_id: otherBrunch.brunch.id,
        p_response_id: response.id,
      })
      expect(otherBrunchResponse.data).toMatchObject({ locked: true })

      const valid = await guest.rpc('get_invite', {
        p_brunch_id: brunch.id,
        p_response_id: response.id,
      })
      expect(valid.data).toMatchObject({
        id: brunch.id,
        title: 'Test brunch',
        menu: { name: fixture.menu.name },
      })
      expect(valid.data).not.toHaveProperty('locked')

      const asHost = await owner.client.rpc('get_invite', {
        p_brunch_id: brunch.id,
      })
      expect(asHost.data).toMatchObject({ title: 'Test brunch' })
    })
  })

  describe('save_response', () => {
    it('saves an attending response with items, choices and add-ons', async () => {
      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: attendingPayload(2),
        }),
      )
      const row = await readResponse(id)
      expect(row).toMatchObject({
        brunch_id: openBrunchId,
        guest_name: 'Sam',
        notes: 'No nuts',
        status: 'attending',
      })
      expect(row.responded_at).not.toBeNull()
      expect(row.response_items).toHaveLength(1)
      expect(row.response_items[0]).toMatchObject({
        item_id: fixture.item.id,
        quantity: 2,
      })
      expect(
        row.response_items[0]?.response_item_choices.map(
          (c) => c.option_choice_id,
        ),
      ).toEqual([fixture.choices[0].id])
      expect(
        row.response_items[0]?.response_item_addons.map((a) => a.addon_id),
      ).toEqual([fixture.addon.id])
    })

    it('keeps an explicit attending status when no items are picked', async () => {
      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: { guest_name: 'Pat', status: 'attending', items: [] },
        }),
      )
      const row = await readResponse(id)
      expect(row.status).toBe('attending')
      expect(row.response_items).toEqual([])
    })

    it('derives the status from items when no status key is given', async () => {
      const withItems = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: {
            guest_name: 'Legacy',
            items: [
              {
                item_id: fixture.item.id,
                option_choice_ids: [fixture.choices[1].id],
              },
            ],
          },
        }),
      )
      expect((await readResponse(withItems)).status).toBe('attending')

      const withoutItems = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: { guest_name: 'Legacy empty' },
        }),
      )
      expect((await readResponse(withoutItems)).status).toBe('declined')
    })

    it('stores a declined response without items', async () => {
      const payload = { ...attendingPayload(), status: 'declined' }
      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: payload,
        }),
      )
      const row = await readResponse(id)
      expect(row.status).toBe('declined')
      expect(row.response_items).toEqual([])
    })

    it('replaces picks when saving again with the response id', async () => {
      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: attendingPayload(2),
        }),
      )
      const again = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_response_id: id,
          p_payload: { ...attendingPayload(1), guest_name: 'Sam renamed' },
        }),
      )
      expect(again).toBe(id)
      const row = await readResponse(id)
      expect(row.guest_name).toBe('Sam renamed')
      expect(row.response_items).toHaveLength(1)
      expect(row.response_items[0]?.quantity).toBe(1)
    })

    it('get_response returns the saved payload by id, and null for an unknown id', async () => {
      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: openBrunchId,
          p_payload: attendingPayload(3),
        }),
      )
      const { data } = await guest.rpc('get_response', { p_response_id: id })
      expect(data).toMatchObject({
        id,
        brunch_id: openBrunchId,
        guest_name: 'Sam',
        status: 'attending',
        items: [{ item_id: fixture.item.id, quantity: 3 }],
      })

      const unknown = await guest.rpc('get_response', {
        p_response_id: crypto.randomUUID(),
      })
      expect(unknown.data).toBeNull()
    })

    it('rejects picks that break the menu rules', async () => {
      const missingRequired = await guest.rpc('save_response', {
        p_brunch_id: openBrunchId,
        p_payload: {
          guest_name: 'X',
          status: 'attending',
          items: [{ item_id: fixture.item.id }],
        },
      })
      expect(missingRequired.error?.message).toMatch(/required option group/)

      const twoChoices = await guest.rpc('save_response', {
        p_brunch_id: openBrunchId,
        p_payload: {
          guest_name: 'X',
          items: [
            {
              item_id: fixture.item.id,
              option_choice_ids: [fixture.choices[0].id, fixture.choices[1].id],
            },
          ],
        },
      })
      expect(twoChoices.error?.message).toMatch(/only one choice/)

      const foreign = await createMenu(owner)
      const foreignItem = await guest.rpc('save_response', {
        p_brunch_id: openBrunchId,
        p_payload: {
          guest_name: 'X',
          items: [
            {
              item_id: foreign.item.id,
              option_choice_ids: [foreign.choices[0].id],
            },
          ],
        },
      })
      expect(foreignItem.error?.message).toMatch(/not on this brunch/)
    })

    it('rejects a closed brunch', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id)
      must(
        await owner.client
          .from('brunches')
          .update({ responses_close_at: '2020-01-01T00:00:00Z' })
          .eq('id', brunch.id)
          .select()
          .single(),
      )
      const { error } = await guest.rpc('save_response', {
        p_brunch_id: brunch.id,
        p_payload: attendingPayload(),
      })
      expect(error?.message).toMatch(/responses are closed/)
    })

    it('rejects a draft brunch', async () => {
      const draft = await createBrunch(owner, fixture.menu.id, { sent: false })
      const { error } = await guest.rpc('save_response', {
        p_brunch_id: draft.brunch.id,
        p_payload: attendingPayload(),
      })
      expect(error?.message).toMatch(/brunch not found/)
    })

    it('invite-only: cannot create a response, but a host-created one can be filled in', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id, {
        inviteOnly: true,
      })
      const created = await guest.rpc('save_response', {
        p_brunch_id: brunch.id,
        p_payload: attendingPayload(),
      })
      expect(created.error?.message).toMatch(/invite only/)

      const hostRow = must(
        await owner.client
          .from('responses')
          .insert({ brunch_id: brunch.id, guest_name: 'Placeholder' })
          .select()
          .single(),
      )
      expect(hostRow.responded_at).toBeNull()

      const id = must(
        await guest.rpc('save_response', {
          p_brunch_id: brunch.id,
          p_response_id: hostRow.id,
          p_payload: attendingPayload(),
        }),
      )
      expect(id).toBe(hostRow.id)
      const row = await readResponse(id)
      expect(row.responded_at).not.toBeNull()
      expect(row.status).toBe('attending')
    })

    it('cannot overwrite a response of another brunch by id', async () => {
      const other = await createBrunch(owner, fixture.menu.id)
      const otherResponse = must(
        await guest.rpc('save_response', {
          p_brunch_id: other.brunch.id,
          p_payload: attendingPayload(),
        }),
      )
      const { error } = await guest.rpc('save_response', {
        p_brunch_id: openBrunchId,
        p_response_id: otherResponse,
        p_payload: { ...attendingPayload(), guest_name: 'Takeover' },
      })
      expect(error?.message).toMatch(/response not found/)
      expect((await readResponse(otherResponse)).guest_name).toBe('Sam')
    })
  })
})
