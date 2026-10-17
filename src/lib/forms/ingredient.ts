import { formOptions } from '@tanstack/react-form'
import {
  ingredientSchemaFor,
  type IngredientInput,
  type IngredientParentKind,
} from '#/lib/schemas/ingredient'

const ingredientDefaults: IngredientInput = { name: '', quantity: '', unit: '' }

export const ingredientFormOptionsFor = (kind: IngredientParentKind) =>
  formOptions({
    defaultValues: ingredientDefaults,
    validators: { onChange: ingredientSchemaFor(kind) },
  })
