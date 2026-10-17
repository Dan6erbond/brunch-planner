import { z } from 'zod'
import { brunchStatusSchema } from './brunch'
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
  status: brunchStatusSchema,
  menus: menuSchema.extend({
    description: menuSchema.shape.description.nullable(),
    items: z.array(inviteItemSchema),
  }),
})
export type Invite = z.infer<typeof inviteSchema>
export type InviteItem = Invite['menus']['items'][number]

export const savedResponseSchema = z.object({
  id: z.uuid(),
  brunch_id: z.uuid(),
  guest_name: z.string(),
  notes: z.string().nullable(),
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
