import { toast } from 'sonner'
import {
  useCreateAddon,
  useDeleteAddon,
  useUpdateAddon,
} from '#/lib/queries/menu-options'
import type { MenuItemDetail } from '#/lib/queries/menus'
import { InlineAddField, InlineNameField } from './inline-name-fields'

type AddonsSectionProps = { menuId: string; item: MenuItemDetail }

export function AddonsSection({ menuId, item }: AddonsSectionProps) {
  const createAddon = useCreateAddon(menuId)
  const updateAddon = useUpdateAddon(menuId)
  const deleteAddon = useDeleteAddon(menuId)

  return (
    <section className="grid gap-3">
      <div>
        <h3 className="font-medium">Add-ons</h3>
        <p className="text-sm text-muted-foreground">
          Optional extras guests can pick any number of, like “Poached egg”.
        </p>
      </div>
      <ul className="grid gap-1">
        {item.addons.map((addon) => (
          <li key={addon.id}>
            <InlineNameField
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
          </li>
        ))}
      </ul>
      <InlineAddField
        label="New add-on name"
        placeholder="Add an add-on"
        onAdd={(name) => createAddon.mutateAsync({ itemId: item.id, name })}
      />
    </section>
  )
}
