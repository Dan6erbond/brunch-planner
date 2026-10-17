import { z } from 'zod'
import { Constants } from '#/lib/supabase/database.types'

export const ingredientParentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('item'), id: z.uuid() }),
  z.object({ kind: z.literal('option_choice'), id: z.uuid() }),
  z.object({ kind: z.literal('addon'), id: z.uuid() }),
])
export type IngredientParent = z.infer<typeof ingredientParentSchema>
export type IngredientParentKind = IngredientParent['kind']

export const ingredientSchema = z.object({
  name: z.string().trim().max(80, 'Keep it under 80 characters'),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' || (Number.isFinite(Number(value)) && Number(value) > 0),
      'Enter a number above 0',
    ),
  unit: z.enum(Constants.public.Enums.ingredient_unit).or(z.literal('')),
})
export type IngredientInput = z.infer<typeof ingredientSchema>

export const ingredientSchemaFor = (kind: IngredientParentKind) =>
  kind === 'item'
    ? ingredientSchema.refine((value) => value.name !== '', {
        path: ['name'],
        error: 'Enter a name',
      })
    : ingredientSchema
