import type { BrunchResponse } from '#/lib/queries/brunches'
import type { MenuDetail } from '#/lib/queries/menus'
import type { Enums } from '#/lib/supabase/database.types'
import { unitSymbol } from '#/features/menus/ingredient-units'
import { isAttending } from './response-summary'

type Ingredient = MenuDetail['items'][number]['ingredients'][number]

export type ShoppingLine = {
  key: string
  name: string
  unit: Enums<'ingredient_unit'> | null
  quantity: number
  hasUnspecifiedAmount: boolean
}

type Counted = { key: string; name: string; quantity: number }

export type ShoppingItemLine = Counted & {
  choices: Counted[]
  addons: Counted[]
}

export type ShoppingList = {
  ingredients: ShoppingLine[]
  itemsWithoutIngredients: ShoppingItemLine[]
}

export const ingredientLineKey = (
  name: string,
  unit: Enums<'ingredient_unit'> | null,
) => `ing:${name.toLowerCase()}|${unit ?? ''}`

export const itemLineKey = (itemId: string) => `item:${itemId}`
export const choiceLineKey = (itemId: string, choiceId: string) =>
  `${itemLineKey(itemId)}:choice:${choiceId}`
export const addonLineKey = (itemId: string, addonId: string) =>
  `${itemLineKey(itemId)}:addon:${addonId}`

const round = (value: number) => Math.round(value * 10_000) / 10_000

// Ingredient quantities are per single serving; they are multiplied by the
// ordered quantity. Units are never converted, so g and kg stay separate lines.
export function buildShoppingList(
  menu: MenuDetail,
  responses: BrunchResponse[],
): ShoppingList {
  const items = new Map(menu.items.map((item) => [item.id, item]))
  const choices = new Map(
    menu.items.flatMap((item) =>
      item.option_groups.flatMap((group) =>
        group.option_choices.map((choice) => [choice.id, choice] as const),
      ),
    ),
  )
  const addons = new Map(
    menu.items.flatMap((item) =>
      item.addons.map((addon) => [addon.id, addon] as const),
    ),
  )

  const lines = new Map<string, ShoppingLine>()
  const add = (
    ingredient: Ingredient,
    fallbackName: string,
    servings: number,
  ) => {
    const name = ingredient.name?.trim() || fallbackName
    const key = ingredientLineKey(name, ingredient.unit)
    const line = lines.get(key) ?? {
      key,
      name,
      unit: ingredient.unit,
      quantity: 0,
      hasUnspecifiedAmount: false,
    }
    if (ingredient.quantity === null) {
      line.hasUnspecifiedAmount = true
    } else {
      line.quantity = round(line.quantity + ingredient.quantity * servings)
    }
    lines.set(key, line)
  }

  type Tally = {
    key: string
    name: string
    quantity: number
    choices: Map<string, Counted>
    addons: Map<string, Counted>
  }
  const tallies = new Map<string, Tally>()
  const bump = (
    map: Map<string, Counted>,
    id: string,
    key: string,
    name: string,
    n: number,
  ) => {
    const entry = map.get(id) ?? { key, name, quantity: 0 }
    entry.quantity += n
    map.set(id, entry)
  }

  for (const response of responses.filter(isAttending)) {
    for (const line of response.response_items) {
      const item = items.get(line.item_id)
      if (!item) continue
      const tally = tallies.get(item.id) ?? {
        key: itemLineKey(item.id),
        name: item.name,
        quantity: 0,
        choices: new Map(),
        addons: new Map(),
      }
      tally.quantity += line.quantity
      tallies.set(item.id, tally)

      for (const ingredient of item.ingredients) {
        add(ingredient, item.name, line.quantity)
      }
      for (const { option_choice_id } of line.response_item_choices) {
        const choice = choices.get(option_choice_id)
        if (!choice) continue
        if (choice.ingredients.length === 0) {
          bump(
            tally.choices,
            choice.id,
            choiceLineKey(item.id, choice.id),
            choice.name,
            line.quantity,
          )
        }
        for (const ingredient of choice.ingredients) {
          add(ingredient, choice.name, line.quantity)
        }
      }
      for (const { addon_id } of line.response_item_addons) {
        const addon = addons.get(addon_id)
        if (!addon) continue
        if (addon.ingredients.length === 0) {
          bump(
            tally.addons,
            addon.id,
            addonLineKey(item.id, addon.id),
            addon.name,
            line.quantity,
          )
        }
        for (const ingredient of addon.ingredients) {
          add(ingredient, addon.name, line.quantity)
        }
      }
    }
  }

  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name)
  const itemsWithoutIngredients = [...tallies.entries()]
    .filter(
      ([id, tally]) =>
        items.get(id)?.ingredients.length === 0 ||
        tally.choices.size > 0 ||
        tally.addons.size > 0,
    )
    .map(([, tally]) => ({
      key: tally.key,
      name: tally.name,
      quantity: tally.quantity,
      choices: [...tally.choices.values()].sort(byName),
      addons: [...tally.addons.values()].sort(byName),
    }))
    .sort(byName)
  return {
    ingredients: [...lines.values()].sort(byName),
    itemsWithoutIngredients,
  }
}

export const isShoppingListEmpty = (list: ShoppingList) =>
  list.ingredients.length === 0 && list.itemsWithoutIngredients.length === 0

const quantityFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

export function formatAmount(line: ShoppingLine) {
  if (line.quantity === 0) return 'amount not set'
  const amount = quantityFormat.format(line.quantity)
  const withUnit = line.unit ? `${amount} ${unitSymbol(line.unit)}` : amount
  return line.hasUnspecifiedAmount ? `${withUnit} + more` : withUnit
}

export const ITEMS_WITHOUT_INGREDIENTS_LABEL = 'Items without ingredients'

export function shoppingListToText({
  ingredients,
  itemsWithoutIngredients,
}: ShoppingList) {
  const ingredientLines = ingredients.map((line) =>
    line.quantity === 0 && line.hasUnspecifiedAmount
      ? `- ${line.name}`
      : `- ${formatAmount(line)} ${line.name}`,
  )
  const itemLines = itemsWithoutIngredients.flatMap((item) => [
    `- ${item.name} x${item.quantity}`,
    ...item.choices.map((c) => `    ${c.name} x${c.quantity}`),
    ...item.addons.map((a) => `    + ${a.name} x${a.quantity}`),
  ])
  return [
    ...ingredientLines,
    ...(itemLines.length > 0
      ? [
          ...(ingredientLines.length > 0 ? [''] : []),
          `${ITEMS_WITHOUT_INGREDIENTS_LABEL}:`,
          ...itemLines,
        ]
      : []),
  ].join('\n')
}
