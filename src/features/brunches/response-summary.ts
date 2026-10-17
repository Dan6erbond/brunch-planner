import type { BrunchResponse } from '#/lib/queries/brunches'
import type { MenuDetail } from '#/lib/queries/menus'

type Response = BrunchResponse
type ResponseItem = Response['response_items'][number]

export const hasResponded = (response: Response) =>
  response.responded_at !== null

// Guests must pick at least one item to submit, so a submitted response with no
// surviving items (e.g. its menu items were deleted) counts as declined.
export const isAttending = (response: Response) =>
  hasResponded(response) && response.response_items.length > 0

export function countGuests(responses: Response[]) {
  const attending = responses.filter(isAttending).length
  const responded = responses.filter(hasResponded).length
  return {
    invited: responses.length,
    responded,
    attending,
    declined: responded - attending,
    pending: responses.length - responded,
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

  return menu.items.map((item) => ({
    id: item.id,
    name: item.name,
    count: total((line) => line.item_id === item.id),
    groups: item.option_groups.map((group) => ({
      id: group.id,
      name: group.name,
      choices: group.option_choices.map((choice) => ({
        id: choice.id,
        name: choice.name,
        count: total((line) =>
          line.response_item_choices.some(
            (c) => c.option_choice_id === choice.id,
          ),
        ),
      })),
    })),
    addons: item.addons.map((addon) => ({
      id: addon.id,
      name: addon.name,
      count: total((line) =>
        line.response_item_addons.some((a) => a.addon_id === addon.id),
      ),
    })),
  }))
}
