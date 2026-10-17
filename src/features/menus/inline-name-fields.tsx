import type { ReactNode } from 'react'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { nameFormOptions } from '#/lib/forms/menu'
import { useAppForm } from '#/lib/forms/use-app-form'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something broke'

type InlineNameFieldProps = {
  name: string
  label: string
  onSave: (name: string) => Promise<unknown>
  onDelete: () => void
  handle?: ReactNode
  actions?: ReactNode
}

export function InlineNameField({
  name,
  label,
  onSave,
  onDelete,
  handle,
  actions,
}: InlineNameFieldProps) {
  const form = useAppForm({
    ...nameFormOptions,
    defaultValues: { name },
    onSubmit: async ({ value }) => {
      const next = value.name.trim()
      if (next === name) return
      try {
        await onSave(next)
        form.reset({ name: next })
      } catch (error) {
        toast.error(errorMessage(error))
        form.reset({ name })
      }
    },
  })

  return (
    <form
      noValidate
      className="flex items-start gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      {handle}
      <div className="min-w-0 flex-1">
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={label}
              hideLabel
              onBlur={() => {
                if (form.state.canSubmit) void form.handleSubmit()
                else form.reset({ name })
              }}
            />
          )}
        </form.AppField>
      </div>
      {actions}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        onClick={onDelete}
      >
        <Trash2Icon />
        <span className="sr-only">Delete {name}</span>
      </Button>
    </form>
  )
}

type InlineAddFieldProps = {
  label: string
  placeholder: string
  onAdd: (name: string) => Promise<unknown>
}

export function InlineAddField({
  label,
  placeholder,
  onAdd,
}: InlineAddFieldProps) {
  const form = useAppForm({
    ...nameFormOptions,
    onSubmit: async ({ value }) => {
      form.reset()
      try {
        await onAdd(value.name)
      } catch (error) {
        toast.error(errorMessage(error))
        form.setFieldValue('name', value.name)
      }
    },
  })

  return (
    <form
      noValidate
      className="flex items-start gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="min-w-0 flex-1">
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label={label}
              hideLabel
              placeholder={placeholder}
              autoComplete="off"
            />
          )}
        </form.AppField>
      </div>
      <form.AppForm>
        <form.SubmitButton variant="secondary" label="Add" pendingLabel="Add" />
      </form.AppForm>
    </form>
  )
}
