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
import { menuFormOptions } from '#/lib/forms/menu'
import { useAppForm } from '#/lib/forms/use-app-form'
import type { MenuInput } from '#/lib/schemas/menu'

type NameDescriptionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  initialValues?: MenuInput
  onSubmit: (value: MenuInput) => Promise<unknown>
}

export function NameDescriptionDialog({
  open,
  onOpenChange,
  ...formProps
}: NameDescriptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <NameDescriptionForm
          onDone={() => {
            onOpenChange(false)
          }}
          {...formProps}
        />
      </DialogContent>
    </Dialog>
  )
}

function NameDescriptionForm({
  title,
  description,
  submitLabel,
  initialValues,
  onSubmit,
  onDone,
}: Omit<NameDescriptionDialogProps, 'open' | 'onOpenChange'> & {
  onDone: () => void
}) {
  const form = useAppForm({
    ...menuFormOptions,
    defaultValues: initialValues ?? menuFormOptions.defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value)
        onDone()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

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
        <form.AppField name="name">
          {(field) => <field.TextField label="Name" autoFocus />}
        </form.AppField>
        <form.AppField name="description">
          {(field) => (
            <field.TextareaField label="Description (optional)" rows={3} />
          )}
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
