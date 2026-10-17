import { z } from 'zod'
import { Constants } from '#/lib/supabase/database.types'

export const MAX_QUANTITY = 20

export const responseStatusSchema = z.enum(
  Constants.public.Enums.response_status,
)
export type ResponseStatus = z.infer<typeof responseStatusSchema>

const rsvpGroupSchema = z.object({
  groupId: z.string(),
  required: z.boolean(),
  choiceId: z.string(),
})

const rsvpItemSchema = z
  .object({
    itemId: z.string(),
    quantity: z.number().int().min(0).max(MAX_QUANTITY),
    groups: z.array(rsvpGroupSchema),
    addonIds: z.array(z.string()),
  })
  .check((ctx) => {
    if (ctx.value.quantity === 0) return
    ctx.value.groups.forEach((group, index) => {
      if (group.required && group.choiceId === '') {
        ctx.issues.push({
          code: 'custom',
          input: group.choiceId,
          path: ['groups', index, 'choiceId'],
          message: 'Pick one',
        })
      }
    })
  })

export const rsvpSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(80, 'Keep it under 80 characters'),
  notes: z.string().trim().max(500, 'Keep it under 500 characters'),
  items: z
    .array(rsvpItemSchema)
    .refine((items) => items.some((item) => item.quantity > 0), {
      message: 'Choose at least one item',
    }),
})
export const declineSchema = rsvpSchema.pick({ guestName: true, notes: true })
export type RsvpInput = z.infer<typeof rsvpSchema>
export type RsvpItemInput = RsvpInput['items'][number]
