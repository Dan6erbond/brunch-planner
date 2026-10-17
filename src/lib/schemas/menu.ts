import { z } from 'zod'

export const menuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name')
    .max(80, 'Keep it under 80 characters'),
  description: z.string().trim().max(500, 'Keep it under 500 characters'),
})
export type MenuInput = z.infer<typeof menuSchema>

export const itemSchema = menuSchema.pick({ name: true, description: true })
export type ItemInput = z.infer<typeof itemSchema>

export const nameSchema = menuSchema.pick({ name: true })
export type NameInput = z.infer<typeof nameSchema>

export const optionGroupSchema = nameSchema.extend({ required: z.boolean() })
export type OptionGroupInput = z.infer<typeof optionGroupSchema>

export const reorderItemsSchema = z.object({
  menuId: z.uuid(),
  itemIds: z.array(z.uuid()).min(1),
})
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>

const idsSchema = z.array(z.uuid()).min(1)

export const reorderOptionGroupsSchema = z.object({
  itemId: z.uuid(),
  groupIds: idsSchema,
})
export type ReorderOptionGroupsInput = z.infer<typeof reorderOptionGroupsSchema>

export const reorderOptionChoicesSchema = z.object({
  itemId: z.uuid(),
  groupId: z.uuid(),
  choiceIds: idsSchema,
})
export type ReorderOptionChoicesInput = z.infer<
  typeof reorderOptionChoicesSchema
>

export const reorderAddonsSchema = z.object({
  itemId: z.uuid(),
  addonIds: idsSchema,
})
export type ReorderAddonsInput = z.infer<typeof reorderAddonsSchema>
