import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import type { Enums } from '#/lib/supabase/database.types'
import {
  addBrunchCollaboratorSchema,
  brunchRoleSchema,
  type AddBrunchCollaboratorInput,
} from '#/lib/schemas/collaborator'
import { brunchKeys } from './keys'

export const brunchCollaboratorQueries = {
  list: (brunchId: string) =>
    queryOptions({
      queryKey: brunchKeys.collaborators(brunchId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc(
          'list_brunch_collaborators',
          { p_brunch_id: brunchId },
        )
        if (error) throw error
        return data
      },
    }),
  role: (brunchId: string) =>
    queryOptions({
      queryKey: brunchKeys.role(brunchId),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase.rpc('my_brunch_role', {
          p_brunch_id: brunchId,
        })
        if (error) throw error
        return brunchRoleSchema.parse(data)
      },
    }),
}

export function useBrunchRole(brunchId: string) {
  const { data } = useSuspenseQuery(brunchCollaboratorQueries.role(brunchId))
  return data
}

export function useAddBrunchCollaborator(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddBrunchCollaboratorInput) => {
      const { email, role } = addBrunchCollaboratorSchema.parse(input)
      const { error } = await supabase.rpc('add_brunch_collaborator', {
        p_brunch_id: brunchId,
        p_email: email,
        p_role: role,
      })
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: brunchKeys.collaborators(brunchId),
      }),
  })
}

export function useUpdateBrunchCollaboratorRole(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string
      role: Enums<'brunch_collaborator_role'>
    }) => {
      const { error } = await supabase
        .from('brunch_collaborators')
        .update({ role })
        .eq('brunch_id', brunchId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: brunchKeys.collaborators(brunchId),
      }),
  })
}

// Used both by the owner removing someone and by a collaborator leaving.
export function useRemoveBrunchCollaborator(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('brunch_collaborators')
        .delete()
        .eq('brunch_id', brunchId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}
