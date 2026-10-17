import { toast } from 'sonner'
import { FieldGroup } from '#/components/ui/field'
import { guestFormOptions } from '#/lib/forms/guest'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useAddGuest } from '#/lib/queries/guests'

export function AddGuestForm({ brunchId }: { brunchId: string }) {
  const addGuest = useAddGuest(brunchId)
  const form = useAppForm({
    ...guestFormOptions,
    onSubmit: async ({ value, formApi }) => {
      try {
        await addGuest.mutateAsync(value)
        toast.success('Guest added. Copy their link to send it.')
        formApi.reset()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something broke')
      }
    },
  })

  return (
    <form
      noValidate
      className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Add a guest"
              autoComplete="off"
              placeholder="Guest name"
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton label="Add guest" pendingLabel="Adding…" />
      </form.AppForm>
    </form>
  )
}
