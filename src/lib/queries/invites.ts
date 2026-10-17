import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '#/lib/supabase/client'
import {
  inviteSchema,
  lockedInviteSchema,
  savedResponseSchema,
} from '#/lib/schemas/invite'
import {
  declineSchema,
  rsvpSchema,
  type ResponseStatus,
  type RsvpInput,
} from '#/lib/schemas/rsvp'
import { inviteKeys } from './keys'

export const inviteQueries = {
  detail: (brunchId: string, responseId?: string) =>
    queryOptions({
      queryKey: inviteKeys.detail(brunchId, responseId),
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_invite', {
          p_brunch_id: brunchId,
          p_response_id: responseId,
        })
        if (error) throw error
        return z
          .union([inviteSchema, lockedInviteSchema])
          .nullable()
          .parse(data)
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

const toPayload = (input: RsvpInput, declined: boolean, pollOpen: boolean) => {
  if (declined) {
    const { guestName, notes } = declineSchema.parse(input)
    return {
      guest_name: guestName,
      notes: notes === '' ? null : notes,
      status: 'declined' satisfies ResponseStatus,
      items: [],
    }
  }
  const { guestName, notes, items, dateVotes } = rsvpSchema.parse(input)
  return {
    guest_name: guestName,
    notes: notes === '' ? null : notes,
    status: 'attending' satisfies ResponseStatus,
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
    date_votes: pollOpen
      ? dateVotes.flatMap((vote) =>
          vote.availability === 'no'
            ? []
            : [
                {
                  date_option_id: vote.dateOptionId,
                  availability: vote.availability,
                },
              ],
        )
      : [],
  }
}

export function useSaveResponse(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      responseId,
      input,
      declined = false,
      pollOpen,
    }: {
      responseId: string | null
      input: RsvpInput
      declined?: boolean
      pollOpen: boolean
    }) => {
      const { data, error } = await supabase.rpc('save_response', {
        p_brunch_id: brunchId,
        // The generated arg type is non-null, but null means "create".
        p_response_id: responseId ?? undefined,
        p_payload: toPayload(input, declined, pollOpen),
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
