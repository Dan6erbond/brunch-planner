import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
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
import { menuQueries, useCreateItem, useUpdateItem } from '#/lib/queries/menus'
import type { Tables } from '#/lib/supabase/database.types'
import { AddonsSection } from './addons-section'
import { OptionGroupsSection } from './option-groups-section'

const FORM_ID = 'menu-item-form'

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
  const { data: menu } = useSuspenseQuery(menuQueries.detail(menuId))
  const createItem = useCreateItem(menuId)
  const updateItem = useUpdateItem(menuId)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const itemId = item?.id ?? createdId
  const savedItem = menu?.items.find((candidate) => candidate.id === itemId)

  const form = useAppForm({
    ...menuFormOptions,
    defaultValues: item
      ? { name: item.name, description: item.description ?? '' }
      : menuFormOptions.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        if (itemId) {
          await updateItem.mutateAsync({ itemId, ...value })
          toast.success('Dish updated')
          onDone()
        } else {
          const created = await createItem.mutateAsync(value)
          setCreatedId(created.id)
          toast.success('Dish added. Add options below, or save to finish.')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

  return (
    <>
      <SheetHeader className="border-b pr-14">
        <SheetTitle>{itemId ? 'Edit dish' : 'Add dish'}</SheetTitle>
        <SheetDescription>
          Name the dish and add a short description if you like.
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid gap-8 p-4 @md/sheet:p-6">
          <form
            id={FORM_ID}
            noValidate
            className="grid gap-6 @xl/sheet:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              void form.handleSubmit()
            }}
          >
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
          </form>
          {savedItem ? (
            <>
              <OptionGroupsSection menuId={menuId} item={savedItem} />
              <AddonsSection menuId={menuId} item={savedItem} />
            </>
          ) : (
            <p className="rounded-3xl border border-dashed p-4 text-sm text-muted-foreground">
              Add the dish first, then you can give it option groups and
              add-ons.
            </p>
          )}
        </div>
      </div>
      <SheetFooter className="sticky bottom-0 mt-0 flex-col-reverse border-t bg-popover p-4 @md/sheet:flex-row @md/sheet:justify-end">
        <form.AppForm>
          <form.SubmitButton
            form={FORM_ID}
            label={itemId ? 'Save' : 'Add dish'}
            pendingLabel="Saving…"
          />
        </form.AppForm>
      </SheetFooter>
    </>
  )
}
