import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { ingredientFormOptions } from '#/lib/forms/ingredient'
import { useAppForm } from '#/lib/forms/use-app-form'
import {
  useCreateIngredient,
  useDeleteIngredient,
  useUpdateIngredient,
} from '#/lib/queries/ingredients'
import {
  INGREDIENT_UNITS,
  type IngredientInput,
  type IngredientParent,
} from '#/lib/schemas/ingredient'
import type { Tables } from '#/lib/supabase/database.types'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something broke'

const toFormValues = (ingredient: Tables<'ingredients'>): IngredientInput => ({
  name: ingredient.name,
  quantity: ingredient.quantity === null ? '' : String(ingredient.quantity),
  unit: ingredient.unit ?? '',
})

type IngredientListProps = {
  menuId: string
  parent: IngredientParent
  ingredients: Tables<'ingredients'>[]
}

export function IngredientList({
  menuId,
  parent,
  ingredients,
}: IngredientListProps) {
  const createIngredient = useCreateIngredient(menuId)
  const updateIngredient = useUpdateIngredient(menuId)
  const deleteIngredient = useDeleteIngredient(menuId)

  return (
    <div className="@container/ingredients grid gap-2">
      <ul className="grid gap-2">
        {ingredients.map((ingredient) => (
          <li key={ingredient.id}>
            <IngredientRow
              initialValues={toFormValues(ingredient)}
              submitLabel="Save"
              onSubmit={(input) =>
                updateIngredient.mutateAsync({
                  ingredientId: ingredient.id,
                  ...input,
                })
              }
              onDelete={() => {
                deleteIngredient.mutate(ingredient.id, {
                  onError: (error) => {
                    toast.error(error.message)
                  },
                })
              }}
            />
          </li>
        ))}
      </ul>
      <IngredientRow
        submitLabel="Add"
        onSubmit={(input) => createIngredient.mutateAsync({ parent, ...input })}
      />
    </div>
  )
}

type IngredientRowProps = {
  submitLabel: string
  initialValues?: IngredientInput
  onSubmit: (input: IngredientInput) => Promise<unknown>
  onDelete?: () => void
}

function IngredientRow({
  submitLabel,
  initialValues,
  onSubmit,
  onDelete,
}: IngredientRowProps) {
  const form = useAppForm({
    ...ingredientFormOptions,
    defaultValues: initialValues ?? ingredientFormOptions.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value)
        form.reset(initialValues ? value : undefined)
      } catch (error) {
        toast.error(errorMessage(error))
      }
    },
  })

  return (
    <form
      noValidate
      className="grid grid-cols-[1fr_1fr] items-start gap-2 @lg/ingredients:grid-cols-[2fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="col-span-2 @lg/ingredients:col-span-1">
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Ingredient name"
              hideLabel
              placeholder="Ingredient"
              autoComplete="off"
            />
          )}
        </form.AppField>
      </div>
      <form.AppField name="quantity">
        {(field) => (
          <field.TextField
            label="Quantity per portion"
            hideLabel
            placeholder="Qty"
            inputMode="decimal"
            autoComplete="off"
          />
        )}
      </form.AppField>
      <form.AppField name="unit">
        {(field) => (
          <field.SelectField
            label="Unit"
            hideLabel
            placeholder="Unit"
            clearLabel="No unit"
            options={INGREDIENT_UNITS}
          />
        )}
      </form.AppField>
      <div className="col-span-2 flex justify-end gap-1 @lg/ingredients:col-span-1">
        <form.Subscribe selector={(state) => state.isDirty}>
          {(isDirty) =>
            (isDirty || !initialValues) && (
              <form.AppForm>
                <form.SubmitButton
                  variant="secondary"
                  label={submitLabel}
                  pendingLabel={submitLabel}
                />
              </form.AppForm>
            )
          }
        </form.Subscribe>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={onDelete}
          >
            <Trash2Icon />
            <span className="sr-only">Delete ingredient</span>
          </Button>
        )}
      </div>
    </form>
  )
}
