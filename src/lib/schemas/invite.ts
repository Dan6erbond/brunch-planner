import { z } from 'zod'
import { Constants } from '#/lib/supabase/database.types'
import { responseStatusSchema } from './rsvp'
import { itemSchema, menuSchema, nameSchema, optionGroupSchema } from './menu'

const withId = { id: z.uuid() }

const optionChoiceSchema = nameSchema.extend(withId)

const inviteOptionGroupSchema = optionGroupSchema.extend({
  ...withId,
  option_choices: z.array(optionChoiceSchema),
})

const addonSchema = nameSchema.extend(withId)

const inviteItemSchema = itemSchema.extend({
  ...withId,
  description: itemSchema.shape.description.nullable(),
  option_groups: z.array(inviteOptionGroupSchema),
  addons: z.array(addonSchema),
})

export const inviteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  scheduling: z.enum(['fixed', 'poll']),
  starts_at: z.string().nullable(),
  invite_only: z.boolean(),
  host_name: z.string().nullable(),
  cohost_names: z.array(z.string()),
  status: z.enum(['open', 'closed']),
  date_options: z.array(z.object({ ...withId, starts_at: z.string() })),
  menu: menuSchema.extend({
    description: menuSchema.shape.description.nullable(),
    items: z.array(inviteItemSchema),
  }),
})
export type Invite = z.infer<typeof inviteSchema>

// get_invite withholds everything but this for invite-only brunches when the
// caller holds no valid guest response id.
export const lockedInviteSchema = z.object({
  id: z.uuid(),
  invite_only: z.literal(true),
  locked: z.literal(true),
})
export type InviteItem = Invite['menu']['items'][number]

export const savedResponseSchema = z.object({
  id: z.uuid(),
  brunch_id: z.uuid(),
  guest_name: z.string(),
  notes: z.string().nullable(),
  status: responseStatusSchema.nullable(),
  date_votes: z.array(
    z.object({
      date_option_id: z.uuid(),
      availability: z.enum(Constants.public.Enums.date_availability),
    }),
  ),
  items: z.array(
    z.object({
      item_id: z.uuid(),
      quantity: z.number(),
      option_choice_ids: z.array(z.uuid()),
      addon_ids: z.array(z.uuid()),
    }),
  ),
})
export type SavedResponse = z.infer<typeof savedResponseSchema>
