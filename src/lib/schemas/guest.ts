import { z } from 'zod'

export const guestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(80, 'Keep it under 80 characters'),
})
export type GuestInput = z.infer<typeof guestSchema>
