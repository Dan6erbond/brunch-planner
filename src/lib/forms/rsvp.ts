import { formOptions } from '@tanstack/react-form'
import type { Invite, SavedResponse } from '#/lib/schemas/invite'
import { rsvpSchema, type RsvpInput } from '#/lib/schemas/rsvp'

export function rsvpDefaults(
  invite: Invite,
  response: SavedResponse | null,
): RsvpInput {
  return {
    guestName: response?.guest_name ?? '',
    notes: response?.notes ?? '',
    items: invite.menu.items.map((item) => {
      const saved = response?.items.find((line) => line.item_id === item.id)
      return {
        itemId: item.id,
        quantity: saved?.quantity ?? 0,
        groups: item.option_groups.map((group) => ({
          groupId: group.id,
          required: group.required,
          choiceId:
            group.option_choices.find((choice) =>
              saved?.option_choice_ids.includes(choice.id),
            )?.id ?? '',
        })),
        addonIds: item.addons
          .filter((addon) => saved?.addon_ids.includes(addon.id))
          .map((addon) => addon.id),
      }
    }),
  }
}

export const rsvpFormOptions = (defaultValues: RsvpInput) =>
  formOptions({
    defaultValues,
    validators: { onChange: rsvpSchema },
  })
