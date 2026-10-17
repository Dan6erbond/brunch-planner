import {
  type InferDataFromTag,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import {
  brunchRowSchema,
  brunchSchema,
  type BrunchInput,
} from '#/lib/schemas/brunch'
import { brunchKeys } from './keys'

const SELECT = '*, menus(name)'

const toNullable = (value: string) => (value === '' ? null : value)

const toRow = (input: BrunchInput) => {
  const { title, menuId, startsAt, location, description } =
    brunchSchema.parse(input)
  return {
    title,
    menu_id: menuId,
    starts_at: new Date(startsAt).toISOString(),
    location: toNullable(location),
    description: toNullable(description),
  }
}

export const brunchQueries = {
  list: () =>
    queryOptions({
      queryKey: brunchKeys.list(),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('brunches_with_status')
          .select(SELECT)
          .order('starts_at', { ascending: true, nullsFirst: false })
        if (error) throw error
        return data.map((row) => brunchRowSchema.parse(row))
      },
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: brunchKeys.detail(id),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('brunches_with_status')
          .select(SELECT)
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        return data ? brunchRowSchema.parse(data) : null
      },
    }),
  responses: (id: string) =>
    queryOptions({
      queryKey: brunchKeys.responses(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('responses')
          .select(
            'id, guest_name, notes, responded_at, created_at, response_items(id, item_id, quantity, response_item_choices(option_choice_id), response_item_addons(addon_id))',
          )
          .eq('brunch_id', id)
          .order('created_at')
        if (error) throw error
        return data
      },
    }),
}

export type BrunchResponse = NonNullable<
  InferDataFromTag<
    unknown,
    ReturnType<typeof brunchQueries.responses>['queryKey']
  >
>[number]

export function useCreateBrunch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BrunchInput) => {
      const { data, error } = await supabase
        .from('brunches')
        .insert(toRow(input))
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}

// The menu can't change once invites are out: guests have already picked from it.
export function useUpdateBrunch(
  brunchId: string,
  options: { lockMenu: boolean },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BrunchInput) => {
      const { menu_id, ...rest } = toRow(input)
      const { error } = await supabase
        .from('brunches')
        .update(options.lockMenu ? rest : { menu_id, ...rest })
        .eq('id', brunchId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}

export function useDeleteBrunch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (brunchId: string) => {
      const { error } = await supabase
        .from('brunches')
        .delete()
        .eq('id', brunchId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}

export function useSendInvites() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (brunchId: string) => {
      const { error } = await supabase
        .from('brunches')
        .update({ invites_sent_at: new Date().toISOString() })
        .eq('id', brunchId)
        .is('invites_sent_at', null)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}
