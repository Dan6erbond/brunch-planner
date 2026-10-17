import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { FieldGroup } from '#/components/ui/field'
import { brunchFormOptions } from '#/lib/forms/brunch'
import { useAppForm } from '#/lib/forms/use-app-form'
import { menuQueries } from '#/lib/queries/menus'
import type { BrunchInput } from '#/lib/schemas/brunch'

type BrunchFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  initialValues?: BrunchInput
  lockMenu?: boolean
  onSubmit: (value: BrunchInput) => Promise<unknown>
}

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
  onSubmit,
  onDone,
}: Omit<BrunchFormDialogProps, 'open' | 'onOpenChange'> & {
  onDone: () => void
}) {
  const { data: menus } = useSuspenseQuery(menuQueries.list())
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
  const menuOptions = menus.map((menu) => ({
    value: menu.id,
    label: menu.name,
  }))

  return (
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
                />
              )}
            </form.AppField>
          ))}
        <form.AppField name="startsAt">
          {(field) => <field.DateTimeField label="Date and time" />}
        </form.AppField>
        <form.AppField name="location">
          {(field) => <field.TextField label="Location (optional)" />}
        </form.AppField>
        <form.AppField name="description">
          {(field) => <field.TextareaField label="Notes (optional)" rows={3} />}
        </form.AppField>
      </FieldGroup>
      <DialogFooter>
        <form.AppForm>
          <form.SubmitButton label={submitLabel} pendingLabel="Saving…" />
        </form.AppForm>
      </DialogFooter>
    </form>
  )
}
