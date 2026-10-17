import type { BrunchResponse } from '#/lib/queries/brunches'

type DateOption = { id: string; starts_at: string }

const beats = (
  a: { yes: number; maybe: number },
  b: { yes: number; maybe: number },
) => a.yes > b.yes || (a.yes === b.yes && a.maybe > b.maybe)

export function tallyPoll(options: DateOption[], responses: BrunchResponse[]) {
  const rows = options.map((option) => {
    const votes = responses.flatMap((response) =>
      response.response_date_votes
        .filter((vote) => vote.date_option_id === option.id)
        .map((vote) => ({
          guest: response.guest_name,
          availability: vote.availability,
        })),
    )
    const count = (availability: 'yes' | 'maybe') =>
      votes.filter((vote) => vote.availability === availability).length
    return { ...option, votes, yes: count('yes'), maybe: count('maybe') }
  })

  const voted = rows.filter((row) => row.yes + row.maybe > 0)
  const best = voted.reduce<(typeof rows)[number] | null>(
    (top, row) => (top === null || beats(row, top) ? row : top),
    null,
  )
  return rows.map((row) => ({
    ...row,
    leading: best !== null && !beats(best, row),
  }))
}
