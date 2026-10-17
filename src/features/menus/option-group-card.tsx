import type { ReactNode } from 'react'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { optionGroupFormOptions } from '#/lib/forms/menu'
import { useAppForm } from '#/lib/forms/use-app-form'
import {
  useCreateOptionChoice,
  useDeleteOptionChoice,
  useReorderOptionChoices,
  useUpdateOptionChoice,
  useUpdateOptionGroup,
} from '#/lib/queries/menu-options'
import { SortableList, SortableRow } from '#/components/sortable'
import type { MenuItemDetail } from '#/lib/queries/menus'
import { NameWithIngredients } from './ingredient-row'
import { InlineAddField } from './inline-name-fields'

type OptionGroup = MenuItemDetail['option_groups'][number]

type OptionGroupCardProps = {
  menuId: string
  itemId: string
  group: OptionGroup
  handle: ReactNode
  onDelete: (group: OptionGroup) => void
}

export function OptionGroupCard({
  menuId,
  itemId,
  group,
  handle,
  onDelete,
}: OptionGroupCardProps) {
  const updateGroup = useUpdateOptionGroup(menuId)
  const createChoice = useCreateOptionChoice(menuId)
  const updateChoice = useUpdateOptionChoice(menuId)
  const deleteChoice = useDeleteOptionChoice(menuId)
  const reorderChoices = useReorderOptionChoices(menuId)

  const form = useAppForm({
    ...optionGroupFormOptions,
    defaultValues: { name: group.name, required: group.required },
    onSubmit: async ({ value }) => {
      const name = value.name.trim()
      if (name === group.name && value.required === group.required) return
      try {
        await updateGroup.mutateAsync({ groupId: group.id, ...value })
        form.reset({ name, required: value.required })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
        form.reset({ name: group.name, required: group.required })
      }
    },
  })

  return (
    <div className="grid gap-3 rounded-3xl border bg-card p-3">
      <form
        noValidate
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="flex items-start gap-1">
          {handle}
          <div className="min-w-0 flex-1">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label="Option group name"
                  hideLabel
                  className="font-medium"
                  onBlur={() => {
                    if (form.state.canSubmit) void form.handleSubmit()
                    else
                      form.reset({ name: group.name, required: group.required })
                  }}
                />
              )}
            </form.AppField>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => {
              onDelete(group)
            }}
          >
            <Trash2Icon />
            <span className="sr-only">Delete {group.name}</span>
          </Button>
        </div>
        <form.AppField name="required">
          {(field) => (
            <field.SwitchField
              label="Guests must pick one"
              onCheckedChange={() => void form.handleSubmit()}
            />
          )}
        </form.AppField>
      </form>
      <SortableList
        ids={group.option_choices.map((choice) => choice.id)}
        onReorder={(choiceIds) => {
          reorderChoices.mutate(
            { itemId, groupId: group.id, choiceIds },
            {
              onError: (error) => {
                toast.error(error.message)
              },
            },
          )
        }}
        className="grid gap-1 border-l-2 pl-3"
      >
        {group.option_choices.map((choice) => (
          <SortableRow
            key={choice.id}
            id={choice.id}
            handleLabel={`Reorder ${choice.name}`}
            className="rounded-3xl"
          >
            {(choiceHandle) => (
              <NameWithIngredients
                menuId={menuId}
                parent={{ kind: 'option_choice', id: choice.id }}
                ingredients={choice.ingredients}
                handle={choiceHandle}
                name={choice.name}
                label="Choice name"
                onSave={(name) =>
                  updateChoice.mutateAsync({ choiceId: choice.id, name })
                }
                onDelete={() => {
                  deleteChoice.mutate(choice.id, {
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  })
                }}
              />
            )}
          </SortableRow>
        ))}
      </SortableList>
      <InlineAddField
        label={`New choice for ${group.name}`}
        placeholder="Add a choice"
        onAdd={(name) =>
          createChoice.mutateAsync({ itemId, groupId: group.id, name })
        }
      />
    </div>
  )
}
