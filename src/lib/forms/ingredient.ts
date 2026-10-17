import { formOptions } from '@tanstack/react-form'
import {
  ingredientSchema,
  type IngredientInput,
} from '#/lib/schemas/ingredient'

const ingredientDefaults: IngredientInput = { name: '', quantity: '', unit: '' }

export const ingredientFormOptions = formOptions({
  defaultValues: ingredientDefaults,
  validators: { onChange: ingredientSchema },
})
