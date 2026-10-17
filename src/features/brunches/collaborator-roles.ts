import type { Enums } from '#/lib/supabase/database.types'

export const brunchRoleLabels: Record<
  Enums<'brunch_collaborator_role'>,
  string
> = {
  viewer: 'Viewer',
  co_host: 'Co-host',
}

export const brunchRoleOptions = Object.entries(brunchRoleLabels).map(
  ([value, label]) => ({ value, label }),
)
