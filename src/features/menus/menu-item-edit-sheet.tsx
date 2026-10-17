import { toast } from 'sonner'
import { FieldGroup } from '#/components/ui/field'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { menuFormOptions } from '#/lib/forms/menu'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useCreateItem, useUpdateItem } from '#/lib/queries/menus'
import type { Tables } from '#/lib/supabase/database.types'

type MenuItemEditSheetProps = {
  menuId: string
  item: Tables<'items'> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MenuItemEditSheet({
  menuId,
  item,
  open,
  onOpenChange,
}: MenuItemEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="@container/sheet data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <MenuItemForm
          menuId={menuId}
          item={item}
          onDone={() => {
            onOpenChange(false)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

function MenuItemForm({
  menuId,
  item,
  onDone,
}: Pick<MenuItemEditSheetProps, 'menuId' | 'item'> & { onDone: () => void }) {
  const createItem = useCreateItem(menuId)
  const updateItem = useUpdateItem(menuId)
  const form = useAppForm({
    ...menuFormOptions,
    defaultValues: item
      ? { name: item.name, description: item.description ?? '' }
      : menuFormOptions.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        if (item) {
          await updateItem.mutateAsync({ itemId: item.id, ...value })
          toast.success('Dish updated')
        } else {
          await createItem.mutateAsync(value)
          toast.success('Dish added')
        }
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <SheetHeader className="border-b pr-14">
        <SheetTitle>{item ? 'Edit dish' : 'Add dish'}</SheetTitle>
        <SheetDescription>
          Name the dish and add a short description if you like.
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid gap-8 p-4 @md/sheet:p-6">
          <section className="grid gap-6 @xl/sheet:grid-cols-2">
            <FieldGroup>
              <form.AppField name="name">
                {(field) => <field.TextField label="Name" autoFocus />}
              </form.AppField>
            </FieldGroup>
            <FieldGroup>
              <form.AppField name="description">
                {(field) => (
                  <field.TextareaField
                    label="Description (optional)"
                    rows={4}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </section>
        </div>
      </div>
      <SheetFooter className="sticky bottom-0 mt-0 flex-col-reverse border-t bg-popover p-4 @md/sheet:flex-row @md/sheet:justify-end">
        <form.AppForm>
          <form.SubmitButton
            label={item ? 'Save' : 'Add dish'}
            pendingLabel="Saving…"
          />
        </form.AppForm>
      </SheetFooter>
    </form>
  )
}
