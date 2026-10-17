import { Card, CardContent } from '#/components/ui/card'
import type { Invite, SavedResponse } from '#/lib/schemas/invite'
import { rsvpDefaults, rsvpFormOptions } from '#/lib/forms/rsvp'

import { FieldGroup } from '#/components/ui/field'
import { MAX_QUANTITY } from '#/lib/schemas/rsvp'
import { toast } from 'sonner'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useNavigate } from '@tanstack/react-router'
import { useSaveResponse } from '#/lib/queries/invites'

type RsvpFormProps = { invite: Invite; response: SavedResponse | null }

export function RsvpForm({ invite, response }: RsvpFormProps) {
  const navigate = useNavigate()
  const saveResponse = useSaveResponse(invite.id)
  const form = useAppForm({
    ...rsvpFormOptions(rsvpDefaults(invite, response)),
    onSubmit: async ({ value }) => {
      try {
        const responseId = await saveResponse.mutateAsync({
          responseId: response?.id ?? null,
          input: value,
        })
        await navigate({
          to: '/invites/$brunchId/$responseId',
          params: { brunchId: invite.id, responseId },
          search: { saved: true },
        })
        window.scrollTo({ top: 0 })
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
      <FieldGroup>
        <form.AppField name="guestName">
          {(field) => (
            <field.TextField
              label="Your name"
              autoComplete="name"
              className="h-12 text-base"
            />
          )}
        </form.AppField>
      </FieldGroup>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">What would you like?</h2>
        {invite.menus.items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                <form.AppField name={`items[${index}].quantity`}>
                  {(field) => (
                    <field.QuantityField label={item.name} max={MAX_QUANTITY} />
                  )}
                </form.AppField>
              </div>
              <form.Subscribe
                selector={(state) => state.values.items[index]?.quantity ?? 0}
              >
                {(quantity) =>
                  quantity > 0 && (
                    <FieldGroup className="gap-5">
                      {item.option_groups.map((group, groupIndex) => (
                        <form.AppField
                          key={group.id}
                          name={`items[${index}].groups[${groupIndex}].choiceId`}
                        >
                          {(field) => (
                            <field.RadioGroupField
                              label={group.name}
                              required={group.required}
                              options={group.option_choices.map((choice) => ({
                                value: choice.id,
                                label: choice.name,
                              }))}
                            />
                          )}
                        </form.AppField>
                      ))}
                      {item.addons.length > 0 && (
                        <form.AppField name={`items[${index}].addonIds`}>
                          {(field) => (
                            <field.CheckboxGroupField
                              label="Add-ons"
                              options={item.addons.map((addon) => ({
                                value: addon.id,
                                label: addon.name,
                              }))}
                            />
                          )}
                        </form.AppField>
                      )}
                    </FieldGroup>
                  )
                }
              </form.Subscribe>
            </CardContent>
          </Card>
        ))}
        <form.Subscribe
          selector={(state) =>
            state.values.items.some((item) => item.quantity > 0)
          }
        >
          {(hasItems) =>
            !hasItems && (
              <p className="text-sm text-muted-foreground">
                Choose at least one item.
              </p>
            )
          }
        </form.Subscribe>
      </div>

      <FieldGroup>
        <form.AppField name="notes">
          {(field) => (
            <field.TextareaField
              label="Note for the host (optional)"
              rows={3}
              placeholder="Allergies, plus-ones, anything else"
            />
          )}
        </form.AppField>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton
          size="lg"
          className="h-12 w-full text-base"
          label={response ? 'Update my response' : 'Send my response'}
          pendingLabel="Sending…"
        />
      </form.AppForm>
    </form>
  )
}
