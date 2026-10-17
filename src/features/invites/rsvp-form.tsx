import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import type { Invite, SavedResponse } from '#/lib/schemas/invite'
import { rsvpDefaults, rsvpFormOptions } from '#/lib/forms/rsvp'

import { FieldGroup } from '#/components/ui/field'
import { MAX_QUANTITY, declineSchema } from '#/lib/schemas/rsvp'
import { toast } from 'sonner'
import { formatDayTime } from '#/lib/date'
import { useAppForm } from '#/lib/forms/use-app-form'
import { useNavigate } from '@tanstack/react-router'
import type { RsvpInput } from '#/lib/schemas/rsvp'
import { useSaveResponse } from '#/lib/queries/invites'

type RsvpFormProps = { invite: Invite; response: SavedResponse | null }

export function RsvpForm({ invite, response }: RsvpFormProps) {
  const navigate = useNavigate()
  const saveResponse = useSaveResponse(invite.id)
  const isDeclined = response?.status === 'declined'
  const pollOpen = invite.scheduling === 'poll' && invite.starts_at === null
  const form = useAppForm({
    ...rsvpFormOptions(rsvpDefaults(invite, response)),
    onSubmit: ({ value }) => save(value, false),
  })

  async function save(value: RsvpInput, declined: boolean) {
    try {
      const responseId = await saveResponse.mutateAsync({
        responseId: response?.id ?? null,
        input: value,
        declined,
        pollOpen,
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
  }

  async function decline() {
    form.setFieldMeta('guestName', (meta) => ({ ...meta, isTouched: true }))
    await form.validateField('guestName', 'change')
    if (!declineSchema.safeParse(form.state.values).success) return
    await save(form.state.values, true)
  }

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      {isDeclined && (
        <Alert>
          <AlertTitle>You’ve told the host you can’t make it</AlertTitle>
          <AlertDescription>
            Changed your mind? Send your RSVP below, picking food is optional.
          </AlertDescription>
        </Alert>
      )}

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

      {pollOpen && (
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold">Which dates work?</h2>
          <Card>
            <CardContent className="grid gap-5">
              {invite.date_options.map((option, index) => (
                <form.AppField
                  key={option.id}
                  name={`dateVotes[${index}].availability`}
                >
                  {(field) => (
                    <field.AvailabilityField
                      label={formatDayTime(option.starts_at)}
                    />
                  )}
                </form.AppField>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">What would you like?</h2>
        <p className="-mt-1 text-sm text-muted-foreground">
          Optional. You can RSVP without choosing food.
        </p>
        {invite.menu.items.map((item, index) => (
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
          label={response && !isDeclined ? 'Update my RSVP' : 'Send RSVP'}
          pendingLabel="Sending…"
        />
        {!isDeclined && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full text-base"
            disabled={saveResponse.isPending}
            onClick={() => {
              void decline()
            }}
          >
            Can’t make it
          </Button>
        )}
      </form.AppForm>
    </form>
  )
}
