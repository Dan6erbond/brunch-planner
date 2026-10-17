import { toast } from 'sonner'
import {
  useCreateAddon,
  useDeleteAddon,
  useReorderAddons,
  useUpdateAddon,
} from '#/lib/queries/menu-options'
import { SortableList, SortableRow } from '#/components/sortable'
import type { MenuItemDetail } from '#/lib/queries/menus'
import { NameWithIngredients } from './ingredient-row'
import { InlineAddField } from './inline-name-fields'

type AddonsSectionProps = { menuId: string; item: MenuItemDetail }

export function AddonsSection({ menuId, item }: AddonsSectionProps) {
  const createAddon = useCreateAddon(menuId)
  const updateAddon = useUpdateAddon(menuId)
  const deleteAddon = useDeleteAddon(menuId)
  const reorderAddons = useReorderAddons(menuId)

  return (
    <section className="grid gap-3">
      <div>
        <h3 className="font-medium">Add-ons</h3>
        <p className="text-sm text-muted-foreground">
          Optional extras guests can pick any number of, like “Poached egg”.
        </p>
      </div>
      <SortableList
        ids={item.addons.map((addon) => addon.id)}
        onReorder={(addonIds) => {
          reorderAddons.mutate(
            { itemId: item.id, addonIds },
            {
              onError: (error) => {
                toast.error(error.message)
              },
            },
          )
        }}
        className="grid gap-1"
      >
        {item.addons.map((addon) => (
          <SortableRow
            key={addon.id}
            id={addon.id}
            handleLabel={`Reorder ${addon.name}`}
            className="rounded-3xl"
          >
            {(handle) => (
              <NameWithIngredients
                menuId={menuId}
                parent={{ kind: 'addon', id: addon.id }}
                ingredients={addon.ingredients}
                handle={handle}
                name={addon.name}
                label="Add-on name"
                onSave={(name) =>
                  updateAddon.mutateAsync({ addonId: addon.id, name })
                }
                onDelete={() => {
                  deleteAddon.mutate(addon.id, {
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
        label="New add-on name"
        placeholder="Add an add-on"
        onAdd={(name) => createAddon.mutateAsync({ itemId: item.id, name })}
      />
    </section>
  )
}
