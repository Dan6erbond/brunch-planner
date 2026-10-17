import type { BrunchResponse } from '#/lib/queries/brunches'
import type { MenuDetail } from '#/lib/queries/menus'
import type { ResponseStatus } from '#/lib/schemas/rsvp'

type Response = BrunchResponse
type ResponseItem = Response['response_items'][number]

export type GuestStatus = ResponseStatus | 'waiting'

export const guestStatusLabels: Record<GuestStatus, string> = {
  attending: 'Attending',
  declined: 'Declined',
  waiting: 'Waiting',
}

// The stored status wins. Rows without one fall back to the old rule: not
// submitted is waiting, submitted with no items is declined.
export function guestStatus(response: Response): GuestStatus {
  if (response.status) return response.status
  if (response.responded_at === null) return 'waiting'
  return response.response_items.length > 0 ? 'attending' : 'declined'
}

export const hasResponded = (response: Response) =>
  guestStatus(response) !== 'waiting'

export const isAttending = (response: Response) =>
  guestStatus(response) === 'attending'

export function countGuests(responses: Response[]) {
  const count = (status: GuestStatus) =>
    responses.filter((response) => guestStatus(response) === status).length
  const attending = count('attending')
  const declined = count('declined')
  return {
    invited: responses.length,
    responded: attending + declined,
    attending,
    declined,
    pending: count('waiting'),
  }
}

const lookups = (menu: MenuDetail) => {
  const items = new Map(menu.items.map((item) => [item.id, item]))
  const choices = new Map(
    menu.items.flatMap((item) =>
      item.option_groups.flatMap((group) =>
        group.option_choices.map(
          (choice) =>
            [choice.id, { group: group.name, name: choice.name }] as const,
        ),
      ),
    ),
  )
  const addons = new Map(
    menu.items.flatMap((item) =>
      item.addons.map((addon) => [addon.id, addon] as const),
    ),
  )
  return { items, choices, addons }
}

export function describePicks(menu: MenuDetail, response: Response) {
  const { items, choices, addons } = lookups(menu)
  return response.response_items.flatMap((line: ResponseItem) => {
    const item = items.get(line.item_id)
    if (!item) return []
    return [
      {
        id: line.id,
        name: item.name,
        quantity: line.quantity,
        choices: line.response_item_choices.flatMap(({ option_choice_id }) => {
          const choice = choices.get(option_choice_id)
          return choice ? [`${choice.group}: ${choice.name}`] : []
        }),
        addons: line.response_item_addons.flatMap(({ addon_id }) => {
          const addon = addons.get(addon_id)
          return addon ? [addon.name] : []
        }),
      },
    ]
  })
}

// Counts are in servings (sum of quantities), attending guests only.
export function summarizeItems(menu: MenuDetail, responses: Response[]) {
  const lines = responses.filter(isAttending).flatMap((r) => r.response_items)
  const total = (matches: (line: ResponseItem) => boolean) =>
    lines.filter(matches).reduce((sum, line) => sum + line.quantity, 0)

  const byCount = <T extends { count: number }>(rows: T[]) =>
    rows.sort((a, b) => b.count - a.count)

  return byCount(
    menu.items.map((item) => ({
      id: item.id,
      name: item.name,
      count: total((line) => line.item_id === item.id),
      groups: item.option_groups.map((group) => ({
        id: group.id,
        name: group.name,
        choices: byCount(
          group.option_choices.map((choice) => ({
            id: choice.id,
            name: choice.name,
            count: total((line) =>
              line.response_item_choices.some(
                (c) => c.option_choice_id === choice.id,
              ),
            ),
          })),
        ),
      })),
      addons: byCount(
        item.addons.map((addon) => ({
          id: addon.id,
          name: addon.name,
          count: total((line) =>
            line.response_item_addons.some((a) => a.addon_id === addon.id),
          ),
        })),
      ),
    })),
  )
}
