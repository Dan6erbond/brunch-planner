import { z } from 'zod'

export const brunchSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title')
    .max(80, 'Keep it under 80 characters'),
  menuId: z.string().min(1, 'Choose a menu'),
  startsAt: z.string().min(1, 'Pick a date and time'),
  location: z.string().trim().max(120, 'Keep it under 120 characters'),
  description: z.string().trim().max(500, 'Keep it under 500 characters'),
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
  starts_at: z.string().nullable(),
  invites_sent_at: z.string().nullable(),
  status: brunchStatusSchema,
  menus: z.object({ name: z.string() }).nullable(),
})
export type BrunchRow = z.infer<typeof brunchRowSchema>
