import { useMutation, useQueryClient } from '@tanstack/react-query'
import { guestSchema, type GuestInput } from '#/lib/schemas/guest'
import { supabase } from '#/lib/supabase/client'
import { brunchKeys } from './keys'

export function useAddGuest(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GuestInput) => {
      const { name } = guestSchema.parse(input)
      const { data, error } = await supabase
        .from('responses')
        .insert({ brunch_id: brunchId, guest_name: name })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: brunchKeys.responses(brunchId),
      }),
  })
}

export function useRemoveGuest(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (responseId: string) => {
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('id', responseId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: brunchKeys.responses(brunchId),
      }),
  })
}
