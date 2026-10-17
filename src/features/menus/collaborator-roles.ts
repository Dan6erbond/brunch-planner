import type { Enums } from '#/lib/supabase/database.types'

export const menuRoleLabels: Record<Enums<'menu_collaborator_role'>, string> = {
  viewer: 'Viewer',
  editor: 'Editor',
}

export const menuRoleOptions = Object.entries(menuRoleLabels).map(
  ([value, label]) => ({ value, label }),
)
