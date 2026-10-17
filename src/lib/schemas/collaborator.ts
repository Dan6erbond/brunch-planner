import { z } from 'zod'
import { Constants } from '#/lib/supabase/database.types'

export const addMenuCollaboratorSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(Constants.public.Enums.menu_collaborator_role),
})
export type AddMenuCollaboratorInput = z.infer<typeof addMenuCollaboratorSchema>

export const menuRoleSchema = z.enum([
  'owner',
  ...Constants.public.Enums.menu_collaborator_role,
  'none',
])
export type MenuRole = z.infer<typeof menuRoleSchema>

export const addBrunchCollaboratorSchema = z.object({
  email: z.email('Enter a valid email address'),
  role: z.enum(Constants.public.Enums.brunch_collaborator_role),
})
export type AddBrunchCollaboratorInput = z.infer<
  typeof addBrunchCollaboratorSchema
>

export const brunchRoleSchema = z.enum([
  'owner',
  ...Constants.public.Enums.brunch_collaborator_role,
  'none',
])
export type BrunchRole = z.infer<typeof brunchRoleSchema>
