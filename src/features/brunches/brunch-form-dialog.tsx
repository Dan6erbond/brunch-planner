import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '#/components/confirm-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
} from '#/components/ui/field'
import { brunchFormOptions } from '#/lib/forms/brunch'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useUserId } from '#/lib/queries/auth'
import { menuQueries, useCopyMenu } from '#/lib/queries/menus'
import type { BrunchInput, Scheduling } from '#/lib/schemas/brunch'

type BrunchFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  initialValues?: BrunchInput
  lockMenu?: boolean
  lockScheduling?: boolean
  lockSlots?: boolean
  onSubmit: (value: BrunchInput) => Promise<unknown>
}

const schedulingOptions: { value: Scheduling; label: string }[] = [
  { value: 'fixed', label: 'Fixed date' },
  { value: 'poll', label: 'Date poll (guests vote)' },
]

const blankSlot = { id: '', startsAt: '' }

export function BrunchFormDialog({
  open,
  onOpenChange,
  ...formProps
}: BrunchFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <BrunchForm
          onDone={() => {
            onOpenChange(false)
          }}
          {...formProps}
        />
      </DialogContent>
    </Dialog>
  )
}

function BrunchForm({
  title,
  description,
  submitLabel,
  initialValues,
  lockMenu,
  lockScheduling,
  lockSlots,
  onSubmit,
  onDone,
}: Omit<BrunchFormDialogProps, 'open' | 'onOpenChange'> & {
  onDone: () => void
}) {
  const userId = useUserId()
  const { data: menus } = useSuspenseQuery(menuQueries.list(userId))
  const form = useAppForm({
    ...brunchFormOptions,
    defaultValues: initialValues ?? brunchFormOptions.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value)
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })
  const copyMenu = useCopyMenu()
  const [sharedPick, setSharedPick] = useState<string | null>(null)
  const sharedMenu = menus.find((menu) => menu.id === sharedPick)
  const menuOptions = [
    ...menus.filter((menu) => menu.role === 'owner'),
    ...menus.filter((menu) => menu.role !== 'owner'),
  ].map((menu) => ({
    value: menu.id,
    label: menu.name,
    group: menu.role === 'owner' ? undefined : 'Shared with me',
  }))
  const onUseCopy = () => {
    if (!sharedPick) return
    copyMenu.mutate(sharedPick, {
      onSuccess: (menuId) => {
        form.setFieldValue('menuId', menuId)
        setSharedPick(null)
        toast.success('Menu copied to your menus')
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  return (
    <>
      <form
        noValidate
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <form.AppField name="title">
            {(field) => <field.TextField label="Title" autoFocus />}
          </form.AppField>
          {!lockMenu &&
            (menus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need a menu first.{' '}
                <Link to="/menus" className="underline underline-offset-4">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <form.AppField name="menuId">
                {(field) => (
                  <field.SelectField
                    label="Menu"
                    placeholder="Choose a menu"
                    options={menuOptions}
                    beforeChange={(value) => {
                      const picked = menus.find((menu) => menu.id === value)
                      if (picked?.role === 'owner') return true
                      setSharedPick(value)
                      return false
                    }}
                  />
                )}
              </form.AppField>
            ))}
          {!lockScheduling && (
            <form.AppField
              name="scheduling"
              listeners={{
                onChange: ({ value }) => {
                  if (
                    value === 'poll' &&
                    form.getFieldValue('slots').length === 0
                  )
                    form.setFieldValue('slots', [blankSlot, blankSlot])
                },
              }}
            >
              {(field) => (
                <field.RadioGroupField
                  label="When"
                  options={schedulingOptions}
                />
              )}
            </form.AppField>
          )}
          <form.Subscribe selector={(state) => state.values.scheduling}>
            {(scheduling) =>
              scheduling === 'fixed' ? (
                <form.AppField name="startsAt">
                  {(field) => <field.DateTimeField label="Date and time" />}
                </form.AppField>
              ) : lockSlots ? (
                <p className="text-sm text-muted-foreground">
                  A date has been picked, so the date options can�t change.
                </p>
              ) : (
                <form.AppField name="slots" mode="array">
                  {(slotsField) => (
                    <FieldSet>
                      <FieldDescription>
                        Date options. Guests vote yes or maybe on each. Removing
                        an option deletes its votes.
                      </FieldDescription>
                      {slotsField.state.value.map((_, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <div className="min-w-0 flex-1">
                            <form.AppField name={`slots[${index}].startsAt`}>
                              {(field) => (
                                <field.DateTimeField
                                  label={`Option ${String(index + 1)}`}
                                />
                              )}
                            </form.AppField>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              void slotsField.removeValue(index)
                            }}
                          >
                            <XIcon />
                            <span className="sr-only">
                              Remove option {index + 1}
                            </span>
                          </Button>
                        </div>
                      ))}
                      {slotsField.state.meta.isTouched && (
                        <FieldError errors={slotsField.state.meta.errors} />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-fit"
                        onClick={() => {
                          slotsField.pushValue(blankSlot)
                        }}
                      >
                        <PlusIcon />
                        Add a date option
                      </Button>
                    </FieldSet>
                  )}
                </form.AppField>
              )
            }
          </form.Subscribe>
          <form.AppField name="responsesCloseAt">
            {(field) => (
              <field.DateTimeField
                label="Close responses (optional)"
                clearable
              />
            )}
          </form.AppField>
          <form.AppField name="location">
            {(field) => <field.TextField label="Location (optional)" />}
          </form.AppField>
          <form.AppField name="description">
            {(field) => (
              <field.TextareaField label="Notes (optional)" rows={3} />
            )}
          </form.AppField>
          <form.AppField name="inviteOnly">
            {(field) => (
              <field.SwitchField label="Invite only (guests get a personal link)" />
            )}
          </form.AppField>
          <form.AppField name="requireItems">
            {(field) => (
              <field.SwitchField
                label="Require at least one item"
                description="Guests who are attending must pick something from the menu."
              />
            )}
          </form.AppField>
        </FieldGroup>
        <DialogFooter>
          <form.AppForm>
            <form.SubmitButton label={submitLabel} pendingLabel="Saving…" />
          </form.AppForm>
        </DialogFooter>
      </form>
      <ConfirmDialog
        open={sharedPick !== null}
        onOpenChange={(next) => {
          if (!next) setSharedPick(null)
        }}
        title="Use a copy?"
        description={`“${sharedMenu?.name ?? ''}” is shared with you. Brunches need a menu you own, so we’ll copy it to your menus and use the copy.`}
        confirmLabel="Use a copy"
        pendingLabel="Copying…"
        pending={copyMenu.isPending}
        onConfirm={onUseCopy}
      />
    </>
  )
}
