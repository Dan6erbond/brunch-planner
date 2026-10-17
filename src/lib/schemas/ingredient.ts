import { z } from 'zod'

export const INGREDIENT_UNITS = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'tsp', label: 'Teaspoon (tsp)' },
  { value: 'tbsp', label: 'Tablespoon (tbsp)' },
  { value: 'cup', label: 'Cup' },
  { value: 'piece', label: 'Piece' },
] as const
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number]['value']

export const ingredientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(80, 'Keep it under 80 characters'),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (Number.isFinite(Number(value)) && Number(value) > 0),
      'Enter a number above 0',
    ),
  unit: z.string().trim().max(20, 'Keep it under 20 characters'),
})
export type IngredientInput = z.infer<typeof ingredientSchema>

export const ingredientParentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('item'), id: z.uuid() }),
  z.object({ kind: z.literal('option_choice'), id: z.uuid() }),
  z.object({ kind: z.literal('addon'), id: z.uuid() }),
])
export type IngredientParent = z.infer<typeof ingredientParentSchema>
