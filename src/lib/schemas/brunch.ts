import { z } from 'zod'
import { Constants } from '#/lib/supabase/database.types'

export const MIN_POLL_SLOTS = 2

export const schedulingSchema = z.enum(Constants.public.Enums.brunch_scheduling)
export type Scheduling = z.infer<typeof schedulingSchema>

// id is empty for a slot that isn't saved yet.
export const slotSchema = z.object({
  id: z.string(),
  startsAt: z.string().min(1, 'Pick a date and time'),
})
export type SlotInput = z.infer<typeof slotSchema>

export const brunchSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Enter a title')
      .max(80, 'Keep it under 80 characters'),
    menuId: z.string().min(1, 'Choose a menu'),
    scheduling: schedulingSchema,
    startsAt: z.string(),
    slots: z.array(slotSchema),
    responsesCloseAt: z.string(),
    location: z.string().trim().max(120, 'Keep it under 120 characters'),
    description: z.string().trim().max(500, 'Keep it under 500 characters'),
    inviteOnly: z.boolean(),
    requireItems: z.boolean(),
  })
  .check((ctx) => {
    const { scheduling, startsAt, slots } = ctx.value
    if (scheduling === 'fixed') {
      if (startsAt === '') {
        ctx.issues.push({
          code: 'custom',
          input: startsAt,
          path: ['startsAt'],
          message: 'Pick a date and time',
        })
      }
      return
    }
    const seen = new Set<number>()
    slots.forEach((slot, index) => {
      if (slot.startsAt === '') return
      const time = new Date(slot.startsAt).getTime()
      if (seen.has(time)) {
        ctx.issues.push({
          code: 'custom',
          input: slot.startsAt,
          path: ['slots', index, 'startsAt'],
          message: 'This date is already an option',
        })
      }
      seen.add(time)
    })
    if (slots.length < MIN_POLL_SLOTS) {
      ctx.issues.push({
        code: 'custom',
        input: slots,
        path: ['slots'],
        message: `Add at least ${String(MIN_POLL_SLOTS)} date options`,
      })
    }
  })
export type BrunchInput = z.infer<typeof brunchSchema>

export const brunchStatusSchema = z.enum(['draft', 'open', 'closed'])
export type BrunchStatus = z.infer<typeof brunchStatusSchema>

// brunches_with_status is typed all-nullable by the generator; parsing narrows it.
export const brunchRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  menu_id: z.uuid(),
  scheduling: schedulingSchema,
  starts_at: z.string().nullable(),
  responses_close_at: z.string().nullable(),
  invites_sent_at: z.string().nullable(),
  invite_only: z.boolean(),
  require_items: z.boolean(),
  status: brunchStatusSchema,
  menus: z.object({ name: z.string() }).nullable(),
})
export type BrunchRow = z.infer<typeof brunchRowSchema>
