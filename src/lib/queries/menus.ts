import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import type { TablesInsert } from '#/lib/supabase/database.types'
import {
  itemSchema,
  menuSchema,
  reorderItemsSchema,
  type ItemInput,
  type MenuInput,
  type ReorderItemsInput,
} from '#/lib/schemas/menu'
import { menuKeys } from './keys'

const FOREIGN_KEY_VIOLATION = '23503'

const toNullable = (value: string) => (value === '' ? null : value)

export const menuQueries = {
  list: () =>
    queryOptions({
      queryKey: menuKeys.list(),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('menus')
          .select('*, items(count)')
          .order('created_at', { ascending: false })
        if (error) throw error
        return data
      },
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: menuKeys.detail(id),
      staleTime: 30_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('menus')
          .select('*, items(*)')
          .eq('id', id)
          .order('position', { referencedTable: 'items' })
          .order('created_at', { referencedTable: 'items' })
          .maybeSingle()
        if (error) throw error
        return data
      },
    }),
}

export function useCreateMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MenuInput) => {
      const { name, description } = menuSchema.parse(input)
      const { data, error } = await supabase
        .from('menus')
        .insert({ name, description: toNullable(description) })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.list() }),
  })
}

export function useUpdateMenu(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MenuInput) => {
      const { name, description } = menuSchema.parse(input)
      const { error } = await supabase
        .from('menus')
        .update({ name, description: toNullable(description) })
        .eq('id', menuId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuKeys.all }),
  })
}

export function useDeleteMenu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (menuId: string) => {
      const { error } = await supabase.from('menus').delete().eq('id', menuId)
      if (error) {
        if (error.code === FOREIGN_KEY_VIOLATION) {
          throw new Error(
            'This menu is used by a brunch, so it can’t be deleted. Delete or change that brunch first.',
          )
        }
        throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuKeys.all }),
  })
}

export function useCreateItem(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      const { name, description } = itemSchema.parse(input)
      const { data: last, error: lastError } = await supabase
        .from('items')
        .select('position')
        .eq('menu_id', menuId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastError) throw lastError
      const row: TablesInsert<'items'> = {
        menu_id: menuId,
        name,
        description: toNullable(description),
        position: last ? last.position + 1 : 0,
      }
      const { error } = await supabase.from('items').insert(row)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

export function useUpdateItem(menuId: string, itemId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ItemInput) => {
      const { name, description } = itemSchema.parse(input)
      const { error } = await supabase
        .from('items')
        .update({ name, description: toNullable(description) })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

export function useDeleteItem(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('items').delete().eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

export function useReorderItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReorderItemsInput) => {
      const { itemIds } = reorderItemsSchema.parse(input)
      const results = await Promise.all(
        itemIds.map((id, position) =>
          supabase.from('items').update({ position }).eq('id', id),
        ),
      )
      const failed = results.find((result) => result.error)
      if (failed?.error) throw failed.error
    },
    onSettled: (_data, _error, { menuId }) =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}
