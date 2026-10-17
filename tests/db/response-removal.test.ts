import { beforeAll, describe, expect, it } from 'vitest'
import {
  anonClient,
  createBrunch,
  createMenu,
  createUser,
  must,
} from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('removing guest responses on an open brunch', () => {
  let owner: TestUser
  let coHost: TestUser
  let viewer: TestUser
  let stranger: TestUser
  let fixture: MenuFixture
  let brunchId: string
  let optionId: string
  const guest = anonClient()

  const submitResponse = async () =>
    must(
      await guest.rpc('save_response', {
        p_brunch_id: brunchId,
        p_payload: {
          guest_name: 'Spammer',
          status: 'attending',
          items: [
            {
              item_id: fixture.item.id,
              quantity: 1,
              option_choice_ids: [fixture.choices[0].id],
              addon_ids: [fixture.addon.id],
            },
          ],
          date_votes: [{ date_option_id: optionId, availability: 'yes' }],
        },
      }),
    )

  const dependents = async (responseId: string) => {
    const read = owner.client
    const [responses, items, votes] = await Promise.all([
      read.from('responses').select('id').eq('id', responseId),
      read.from('response_items').select('id').eq('response_id', responseId),
      read
        .from('response_date_votes')
        .select('response_id')
        .eq('response_id', responseId),
    ])
    return {
      responses: must(responses).length,
      items: must(items).length,
      votes: must(votes).length,
    }
  }

  beforeAll(async () => {
    ;[owner, coHost, viewer, stranger] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])
    fixture = await createMenu(owner)
    const created = await createBrunch(owner, fixture.menu.id, { poll: true })
    brunchId = created.brunch.id
    const option = created.dateOptions.at(0)
    if (!option) throw new Error('poll slots not created')
    optionId = option.id
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
    ['co_host', () => coHost],
  ])('%s deletes a response with its selections and votes', async (_, who) => {
    const id = await submitResponse()
    expect(await dependents(id)).toEqual({ responses: 1, items: 1, votes: 1 })

    const removed = must(
      await who().client.from('responses').delete().eq('id', id).select(),
    )
    expect(removed).toHaveLength(1)
    expect(await dependents(id)).toEqual({ responses: 0, items: 0, votes: 0 })
  })

  it.each([
    ['viewer', () => viewer.client],
    ['stranger', () => stranger.client],
    ['anon', () => guest],
  ])('%s cannot delete a response', async (_, client) => {
    const id = await submitResponse()
    const removed = must(
      await client().from('responses').delete().eq('id', id).select(),
    )
    expect(removed).toEqual([])
    expect(await dependents(id)).toEqual({ responses: 1, items: 1, votes: 1 })
  })
})
