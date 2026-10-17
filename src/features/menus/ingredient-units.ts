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

export const unitOptions = Object.entries(unitLabels).map(([value, label]) => ({
  value,
  label,
}))
