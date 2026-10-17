import { z } from 'zod'

export const toggleShoppingCheckSchema = z.object({
  lineKey: z.string().min(1),
  checked: z.boolean(),
})
