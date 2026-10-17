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
  const { title, menuId, startsAt, location, description, inviteOnly } =
    brunchSchema.parse(input)
  return {
    title,
    menu_id: menuId,
    starts_at: new Date(startsAt).toISOString(),
    location: toNullable(location),
    description: toNullable(description),
    invite_only: inviteOnly,
  }
}

export const brunchQueries = {
  list: (userId: string) =>
    queryOptions({
      queryKey: brunchKeys.list(userId),
      staleTime: 30_000,
      queryFn: async () => {
        const { data: shared, error: sharedError } = await supabase
          .from('brunch_collaborators')
          .select('brunch_id, role')
          .eq('user_id', userId)
        if (sharedError) throw sharedError
        const roles = new Map(shared.map((row) => [row.brunch_id, row.role]))
        const filter = [`owner_id.eq.${userId}`]
        if (roles.size > 0)
          filter.push(`id.in.(${[...roles.keys()].join(',')})`)
        const { data, error } = await supabase
          .from('brunches_with_status')
          .select(SELECT)
          .or(filter.join(','))
          .order('starts_at', { ascending: true, nullsFirst: false })
        if (error) throw error
        return data.map((row) => {
          const brunch = brunchRowSchema.parse(row)
          return { ...brunch, role: roles.get(brunch.id) ?? ('owner' as const) }
        })
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

export type BrunchListRow = InferDataFromTag<
  unknown,
  ReturnType<typeof brunchQueries.list>['queryKey']
>[number]

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
