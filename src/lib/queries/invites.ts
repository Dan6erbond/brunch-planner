import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import { inviteSchema, savedResponseSchema } from '#/lib/schemas/invite'
import { rsvpSchema, type RsvpInput } from '#/lib/schemas/rsvp'
import { inviteKeys } from './keys'

export const inviteQueries = {
  detail: (brunchId: string) =>
    queryOptions({
      queryKey: inviteKeys.detail(brunchId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_invite', {
          p_brunch_id: brunchId,
        })
        if (error) throw error
        return inviteSchema.nullable().parse(data)
      },
    }),
  response: (responseId: string) =>
    queryOptions({
      queryKey: inviteKeys.response(responseId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_response', {
          p_response_id: responseId,
        })
        if (error) throw error
        return savedResponseSchema.nullable().parse(data)
      },
    }),
}

const toPayload = (input: RsvpInput) => {
  const { guestName, notes, items } = rsvpSchema.parse(input)
  return {
    guest_name: guestName,
    notes: notes === '' ? null : notes,
    items: items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        item_id: item.itemId,
        quantity: item.quantity,
        option_choice_ids: item.groups.flatMap((group) =>
          group.choiceId === '' ? [] : [group.choiceId],
        ),
        addon_ids: item.addonIds,
      })),
  }
}

export function useSaveResponse(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      responseId,
      input,
    }: {
      responseId: string | null
      input: RsvpInput
    }) => {
      const { data, error } = await supabase.rpc('save_response', {
        p_brunch_id: brunchId,
        // The generated arg type is non-null, but null means "create".
        p_response_id: responseId ?? undefined,
        p_payload: toPayload(input),
      })
      if (error) throw error
      return data
    },
    onSuccess: (responseId) =>
      queryClient.invalidateQueries({
        queryKey: inviteKeys.response(responseId),
      }),
  })
}
