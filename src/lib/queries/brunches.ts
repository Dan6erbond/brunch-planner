import { z } from 'zod'
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
  type SlotInput,
} from '#/lib/schemas/brunch'
import { brunchKeys } from './keys'

const SELECT = '*, menus(name)'

const toNullable = (value: string) => (value === '' ? null : value)

const toIso = (value: string) => new Date(value).toISOString()

const toRow = (input: BrunchInput) => {
  const {
    title,
    menuId,
    scheduling,
    startsAt,
    responsesCloseAt,
    location,
    description,
    inviteOnly,
  } = brunchSchema.parse(input)
  return {
    title,
    menu_id: menuId,
    scheduling,
    starts_at: scheduling === 'fixed' ? toIso(startsAt) : null,
    responses_close_at:
      responsesCloseAt === '' ? null : toIso(responsesCloseAt),
    location: toNullable(location),
    description: toNullable(description),
    invite_only: inviteOnly,
  }
}

const dateOptionSchema = z.object({ id: z.uuid(), starts_at: z.string() })

async function syncSlots(brunchId: string, slots: SlotInput[]) {
  const { data, error } = await supabase
    .from('brunch_date_options')
    .select('id, starts_at')
    .eq('brunch_id', brunchId)
  if (error) throw error
  const existing = new Map(data.map((slot) => [slot.id, slot.starts_at]))
  const kept = new Set(slots.map((slot) => slot.id))

  const removed = [...existing.keys()].filter((id) => !kept.has(id))
  if (removed.length > 0) {
    const { error: deleteError } = await supabase
      .from('brunch_date_options')
      .delete()
      .in('id', removed)
    if (deleteError) throw deleteError
  }

  for (const slot of slots) {
    const current = existing.get(slot.id)
    if (current === undefined || toIso(current) === toIso(slot.startsAt))
      continue
    const { error: updateError } = await supabase
      .from('brunch_date_options')
      .update({ starts_at: toIso(slot.startsAt) })
      .eq('id', slot.id)
    if (updateError) throw updateError
  }

  const added = slots
    .filter((slot) => !existing.has(slot.id))
    .map((slot) => ({ brunch_id: brunchId, starts_at: toIso(slot.startsAt) }))
  if (added.length > 0) {
    const { error: insertError } = await supabase
      .from('brunch_date_options')
      .insert(added)
    if (insertError) throw insertError
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
  dateOptions: (id: string) =>
    queryOptions({
      queryKey: brunchKeys.dateOptions(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('brunch_date_options')
          .select('id, starts_at')
          .eq('brunch_id', id)
        if (error) throw error
        return z
          .array(dateOptionSchema)
          .parse(data)
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          )
      },
    }),
  responses: (id: string) =>
    queryOptions({
      queryKey: brunchKeys.responses(id),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('responses')
          .select(
            'id, guest_name, notes, status, responded_at, created_at, response_items(id, item_id, quantity, response_item_choices(option_choice_id), response_item_addons(addon_id)), response_date_votes(date_option_id, availability)',
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
      if (input.scheduling === 'poll') await syncSlots(data.id, input.slots)
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}

// The menu can't change once invites are out: guests have already picked from
// it. Likewise the fixed/poll mode, and the slots once a winner is picked.
export function useUpdateBrunch(
  brunchId: string,
  lock: { menu: boolean; scheduling: boolean; slots: boolean },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BrunchInput) => {
      const { menu_id, scheduling, starts_at, ...rest } = toRow(input)
      const { error } = await supabase
        .from('brunches')
        .update({
          ...rest,
          ...(lock.menu ? {} : { menu_id }),
          ...(lock.scheduling
            ? input.scheduling === 'fixed'
              ? { starts_at }
              : {}
            : { scheduling, starts_at }),
        })
        .eq('id', brunchId)
      if (error) throw error
      if (!lock.slots && !(lock.scheduling && input.scheduling === 'fixed'))
        await syncSlots(
          brunchId,
          input.scheduling === 'poll' ? input.slots : [],
        )
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: brunchKeys.all }),
  })
}

export function usePickDateWinner(brunchId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dateOptionId: string) => {
      const { error } = await supabase.rpc('pick_date_winner', {
        p_brunch_id: brunchId,
        p_date_option_id: dateOptionId,
      })
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
