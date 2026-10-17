import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import type { Enums } from '#/lib/supabase/database.types'
import {
  addMenuCollaboratorSchema,
  menuRoleSchema,
  type AddMenuCollaboratorInput,
} from '#/lib/schemas/collaborator'
import { menuKeys } from './keys'

export const menuCollaboratorQueries = {
  list: (menuId: string) =>
    queryOptions({
      queryKey: menuKeys.collaborators(menuId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('list_menu_collaborators', {
          p_menu_id: menuId,
        })
        if (error) throw error
        return data
      },
    }),
  role: (menuId: string) =>
    queryOptions({
      queryKey: menuKeys.role(menuId),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase.rpc('my_menu_role', {
          p_menu_id: menuId,
        })
        if (error) throw error
        return menuRoleSchema.parse(data)
      },
    }),
}

export function useMenuRole(menuId: string) {
  const { data } = useSuspenseQuery(menuCollaboratorQueries.role(menuId))
  return data
}

export function useAddMenuCollaborator(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddMenuCollaboratorInput) => {
      const { email, role } = addMenuCollaboratorSchema.parse(input)
      const { error } = await supabase.rpc('add_menu_collaborator', {
        p_menu_id: menuId,
        p_email: email,
        p_role: role,
      })
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.collaborators(menuId),
      }),
  })
}

export function useUpdateMenuCollaboratorRole(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string
      role: Enums<'menu_collaborator_role'>
    }) => {
      const { error } = await supabase
        .from('menu_collaborators')
        .update({ role })
        .eq('menu_id', menuId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: menuKeys.collaborators(menuId),
      }),
  })
}

// Used both by the owner removing someone and by a collaborator leaving.
export function useRemoveMenuCollaborator(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('menu_collaborators')
        .delete()
        .eq('menu_id', menuId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuKeys.all }),
  })
}
