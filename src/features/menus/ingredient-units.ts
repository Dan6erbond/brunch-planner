import type { Enums } from '#/lib/supabase/database.types'

export const unitLabels: Record<Enums<'ingredient_unit'>, string> = {
  g: 'Gram (g)',
  kg: 'Kilogram (kg)',
  ml: 'Milliliter (ml)',
  l: 'Liter (l)',
  tsp: 'Teaspoon (tsp)',
  tbsp: 'Tablespoon (tbsp)',
  cup: 'Cup',
  piece: 'Piece',
}

const unitSymbols: Record<Enums<'ingredient_unit'>, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  tsp: 'tsp',
  tbsp: 'tbsp',
  cup: 'cup',
  piece: 'piece',
}

export const unitSymbol = (unit: Enums<'ingredient_unit'>) => unitSymbols[unit]

export const unitOptions = Object.entries(unitLabels).map(([value, label]) => ({
  value,
  label,
}))
