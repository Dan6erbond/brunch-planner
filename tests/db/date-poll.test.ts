import { beforeAll, describe, expect, it } from 'vitest'
import {
  anonClient,
  createBrunch,
  createMenu,
  createUser,
  must,
} from './helpers'
import type { MenuFixture, TestUser } from './helpers'

describe('date poll', () => {
  let owner: TestUser
  let coHost: TestUser
  let viewer: TestUser
  let stranger: TestUser
  let fixture: MenuFixture
  const guest = anonClient()

  const newPoll = async (sent = true) => {
    const created = await createBrunch(owner, fixture.menu.id, {
      poll: true,
      sent,
    })
    for (const [user, role] of [
      [coHost, 'co_host'],
      [viewer, 'viewer'],
    ] as const) {
      const { error } = await owner.client.rpc('add_brunch_collaborator', {
        p_brunch_id: created.brunch.id,
        p_email: user.email,
        p_role: role,
      })
      expect(error).toBeNull()
    }
    const first = created.dateOptions.at(0)
    const second = created.dateOptions.at(1)
    if (!first || !second) throw new Error('poll slots not created')
    return { brunchId: created.brunch.id, first, second }
  }

  const vote = (brunchId: string, optionId: string, name = 'Voter') =>
    guest.rpc('save_response', {
      p_brunch_id: brunchId,
      p_payload: {
        guest_name: name,
        status: 'attending',
        date_votes: [{ date_option_id: optionId, availability: 'yes' }],
      },
    })

  beforeAll(async () => {
    ;[owner, coHost, viewer, stranger] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ])
    fixture = await createMenu(owner)
  })

  it('stores guest date votes while the poll is open', async () => {
    const { brunchId, first } = await newPoll()
    const id = must(await vote(brunchId, first.id))
    const votes = must(
      await owner.client
        .from('response_date_votes')
        .select()
        .eq('response_id', id),
    )
    expect(votes).toEqual([
      { response_id: id, date_option_id: first.id, availability: 'yes' },
    ])
  })

  it('the owner picks the winner, which sets starts_at', async () => {
    const { brunchId, second } = await newPoll()
    const { error } = await owner.client.rpc('pick_date_winner', {
      p_brunch_id: brunchId,
      p_date_option_id: second.id,
    })
    expect(error).toBeNull()
    const brunch = must(
      await owner.client.from('brunches').select().eq('id', brunchId).single(),
    )
    expect(new Date(brunch.starts_at ?? '').toISOString()).toBe(
      new Date(second.starts_at).toISOString(),
    )
  })

  it('a co_host can pick the winner', async () => {
    const { brunchId, first } = await newPoll()
    const { error } = await coHost.client.rpc('pick_date_winner', {
      p_brunch_id: brunchId,
      p_date_option_id: first.id,
    })
    expect(error).toBeNull()
  })

  it('a viewer, a stranger and an anonymous guest cannot pick the winner', async () => {
    const { brunchId, first } = await newPoll()
    for (const client of [viewer.client, stranger.client]) {
      const { error } = await client.rpc('pick_date_winner', {
        p_brunch_id: brunchId,
        p_date_option_id: first.id,
      })
      expect(error?.message).toMatch(/Only the host or a co-host/)
    }
    const anon = await guest.rpc('pick_date_winner', {
      p_brunch_id: brunchId,
      p_date_option_id: first.id,
    })
    expect(anon.error).not.toBeNull()

    const brunch = must(
      await owner.client.from('brunches').select().eq('id', brunchId).single(),
    )
    expect(brunch.starts_at).toBeNull()
  })

  it('rejects slots of another brunch and drafts', async () => {
    const poll = await newPoll()
    const other = await newPoll()
    const foreign = await owner.client.rpc('pick_date_winner', {
      p_brunch_id: poll.brunchId,
      p_date_option_id: other.first.id,
    })
    expect(foreign.error?.message).toMatch(/does not belong to this brunch/)

    const draft = await newPoll(false)
    const early = await owner.client.rpc('pick_date_winner', {
      p_brunch_id: draft.brunchId,
      p_date_option_id: draft.first.id,
    })
    expect(early.error?.message).toMatch(/send the invites/)
  })

  it('rejects a fixed-date brunch', async () => {
    const { brunch } = await createBrunch(owner, fixture.menu.id)
    const { error } = await owner.client.rpc('pick_date_winner', {
      p_brunch_id: brunch.id,
      p_date_option_id: crypto.randomUUID(),
    })
    expect(error?.message).toMatch(/no date poll/)
  })

  describe('after a winner is picked the poll is frozen', () => {
    let brunchId: string
    let first: { id: string; starts_at: string }
    let second: { id: string; starts_at: string }
    let earlyVoter: string

    beforeAll(async () => {
      ;({ brunchId, first, second } = await newPoll())
      earlyVoter = must(await vote(brunchId, first.id, 'Early'))
      const { error } = await owner.client.rpc('pick_date_winner', {
        p_brunch_id: brunchId,
        p_date_option_id: first.id,
      })
      expect(error).toBeNull()
    })

    it('picking again fails, for owner and co_host alike', async () => {
      for (const client of [owner.client, coHost.client]) {
        const { error } = await client.rpc('pick_date_winner', {
          p_brunch_id: brunchId,
          p_date_option_id: second.id,
        })
        expect(error?.message).toMatch(/already picked/)
      }
    })

    it('slots can no longer be added, changed or removed', async () => {
      const add = await owner.client.from('brunch_date_options').insert({
        brunch_id: brunchId,
        starts_at: '2030-03-01T10:00:00Z',
      })
      expect(add.error?.message).toMatch(/poll is frozen/)

      const change = await owner.client
        .from('brunch_date_options')
        .update({ starts_at: '2030-03-02T10:00:00Z' })
        .eq('id', second.id)
      expect(change.error?.message).toMatch(/poll is frozen/)

      const remove = await owner.client
        .from('brunch_date_options')
        .delete()
        .eq('id', second.id)
      expect(remove.error?.message).toMatch(/poll is frozen/)
    })

    it('starts_at cannot be changed directly', async () => {
      const { error } = await owner.client
        .from('brunches')
        .update({ starts_at: second.starts_at })
        .eq('id', brunchId)
      expect(error?.message).toMatch(/already picked/)
    })

    it('new guests can still respond, but their date votes are ignored', async () => {
      const id = must(await vote(brunchId, second.id, 'Late'))
      const votes = must(
        await owner.client
          .from('response_date_votes')
          .select()
          .eq('response_id', id),
      )
      expect(votes).toEqual([])
      const row = must(
        await owner.client.from('responses').select().eq('id', id).single(),
      )
      expect(row.status).toBe('attending')
    })

    it('an existing guest re-saving keeps their earlier votes', async () => {
      const { error } = await guest.rpc('save_response', {
        p_brunch_id: brunchId,
        p_response_id: earlyVoter,
        p_payload: {
          guest_name: 'Early',
          status: 'attending',
          date_votes: [{ date_option_id: second.id, availability: 'maybe' }],
        },
      })
      expect(error).toBeNull()
      const votes = must(
        await owner.client
          .from('response_date_votes')
          .select()
          .eq('response_id', earlyVoter),
      )
      expect(votes).toEqual([
        {
          response_id: earlyVoter,
          date_option_id: first.id,
          availability: 'yes',
        },
      ])
    })
  })

  describe('poll guards', () => {
    it('a poll cannot be sent without slots', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id, {
        poll: true,
        slots: [],
        sent: false,
      })
      const { error } = await owner.client
        .from('brunches')
        .update({ invites_sent_at: new Date().toISOString() })
        .eq('id', brunch.id)
      expect(error?.message).toMatch(/add date options/)
    })

    it('fixed brunches cannot have date options', async () => {
      const { brunch } = await createBrunch(owner, fixture.menu.id)
      const { error } = await owner.client
        .from('brunch_date_options')
        .insert({ brunch_id: brunch.id, starts_at: '2030-03-01T10:00:00Z' })
      expect(error?.message).toMatch(/only poll brunches/)
    })

    it('the scheduling mode cannot change once invites are sent', async () => {
      const { brunchId } = await newPoll()
      const { error } = await owner.client
        .from('brunches')
        .update({ scheduling: 'fixed', starts_at: '2030-01-01T10:00:00Z' })
        .eq('id', brunchId)
      expect(error?.message).toMatch(/cannot change once invites are sent/)
    })

    it('a viewer cannot edit slots', async () => {
      const { brunchId } = await newPoll(false)
      const { error } = await viewer.client
        .from('brunch_date_options')
        .insert({ brunch_id: brunchId, starts_at: '2030-04-01T10:00:00Z' })
      expect(error).not.toBeNull()
    })
  })
})
