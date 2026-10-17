import { useState } from 'react'
import { toast } from 'sonner'
import {
  useCreateOptionGroup,
  useDeleteOptionGroup,
} from '#/lib/queries/menu-options'
import type { MenuItemDetail } from '#/lib/queries/menus'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { InlineAddField } from './inline-name-fields'
import { OptionGroupCard } from './option-group-card'

type OptionGroup = MenuItemDetail['option_groups'][number]

type OptionGroupsSectionProps = { menuId: string; item: MenuItemDetail }

export function OptionGroupsSection({
  menuId,
  item,
}: OptionGroupsSectionProps) {
  const createGroup = useCreateOptionGroup(menuId)
  const deleteGroup = useDeleteOptionGroup(menuId)
  const [deleting, setDeleting] = useState<OptionGroup | null>(null)

  const removeGroup = (group: OptionGroup) => {
    if (group.option_choices.length === 0) {
      deleteGroup.mutate(group.id, {
        onError: (error) => {
          toast.error(error.message)
        },
      })
    } else {
      setDeleting(group)
    }
  }

  return (
    <section className="grid gap-3">
      <div>
        <h3 className="font-medium">Option groups</h3>
        <p className="text-sm text-muted-foreground">
          Pick-one choices, like “Bread” with sourdough, rye or gluten-free.
        </p>
      </div>
      {item.option_groups.length > 0 && (
        <ul className="grid gap-3 @xl/sheet:grid-cols-2">
          {item.option_groups.map((group) => (
            <li key={group.id}>
              <OptionGroupCard
                menuId={menuId}
                itemId={item.id}
                group={group}
                onDelete={removeGroup}
              />
            </li>
          ))}
        </ul>
      )}
      <InlineAddField
        label="New option group name"
        placeholder="Add an option group, e.g. Bread"
        onAdd={(name) => createGroup.mutateAsync({ itemId: item.id, name })}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description={`This also deletes its ${String(deleting?.option_choices.length ?? 0)} choices. It can’t be undone.`}
        pending={deleteGroup.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteGroup.mutate(deleting.id, {
            onError: (error) => {
              toast.error(error.message)
            },
            onSettled: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </section>
  )
}
