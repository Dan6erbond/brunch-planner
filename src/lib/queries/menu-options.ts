import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import {
  nameSchema,
  optionGroupSchema,
  reorderAddonsSchema,
  reorderOptionChoicesSchema,
  reorderOptionGroupsSchema,
  type NameInput,
  type OptionGroupInput,
  type ReorderAddonsInput,
  type ReorderOptionChoicesInput,
  type ReorderOptionGroupsInput,
} from '#/lib/schemas/menu'
import { menuKeys } from './keys'
import { menuQueries, type MenuItemDetail } from './menus'

const maxPosition = (rows: { position: number }[] | undefined) =>
  rows?.reduce((max, row) => Math.max(max, row.position), -1) ?? -1

function useMenuMutation<TInput>(
  menuId: string,
  mutationFn: (input: TInput) => Promise<void>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

function useCachedItem(menuId: string) {
  const queryClient = useQueryClient()
  return (itemId: string) =>
    queryClient
      .getQueryData(menuQueries.detail(menuId).queryKey)
      ?.items.find((item) => item.id === itemId)
}

export function useCreateOptionGroup(menuId: string) {
  const findItem = useCachedItem(menuId)
  return useMenuMutation(
    menuId,
    async ({ itemId, ...input }: NameInput & { itemId: string }) => {
      const { name } = nameSchema.parse(input)
      const { error } = await supabase.from('option_groups').insert({
        item_id: itemId,
        name,
        position: maxPosition(findItem(itemId)?.option_groups) + 1,
      })
      if (error) throw error
    },
  )
}

export function useUpdateOptionGroup(menuId: string) {
  return useMenuMutation(
    menuId,
    async ({ groupId, ...input }: OptionGroupInput & { groupId: string }) => {
      const { name, required } = optionGroupSchema.parse(input)
      const { error } = await supabase
        .from('option_groups')
        .update({ name, required })
        .eq('id', groupId)
      if (error) throw error
    },
  )
}

export function useDeleteOptionGroup(menuId: string) {
  return useMenuMutation(menuId, async (groupId: string) => {
    const { error } = await supabase
      .from('option_groups')
      .delete()
      .eq('id', groupId)
    if (error) throw error
  })
}

export function useCreateOptionChoice(menuId: string) {
  const findItem = useCachedItem(menuId)
  return useMenuMutation(
    menuId,
    async ({
      itemId,
      groupId,
      ...input
    }: NameInput & { itemId: string; groupId: string }) => {
      const { name } = nameSchema.parse(input)
      const group = findItem(itemId)?.option_groups.find(
        (candidate) => candidate.id === groupId,
      )
      const { error } = await supabase.from('option_choices').insert({
        option_group_id: groupId,
        name,
        position: maxPosition(group?.option_choices) + 1,
      })
      if (error) throw error
    },
  )
}

export function useUpdateOptionChoice(menuId: string) {
  return useMenuMutation(
    menuId,
    async ({ choiceId, ...input }: NameInput & { choiceId: string }) => {
      const { name } = nameSchema.parse(input)
      const { error } = await supabase
        .from('option_choices')
        .update({ name })
        .eq('id', choiceId)
      if (error) throw error
    },
  )
}

export function useDeleteOptionChoice(menuId: string) {
  return useMenuMutation(menuId, async (choiceId: string) => {
    const { error } = await supabase
      .from('option_choices')
      .delete()
      .eq('id', choiceId)
    if (error) throw error
  })
}

export function useCreateAddon(menuId: string) {
  const findItem = useCachedItem(menuId)
  return useMenuMutation(
    menuId,
    async ({ itemId, ...input }: NameInput & { itemId: string }) => {
      const { name } = nameSchema.parse(input)
      const { error } = await supabase.from('addons').insert({
        item_id: itemId,
        name,
        position: maxPosition(findItem(itemId)?.addons) + 1,
      })
      if (error) throw error
    },
  )
}

export function useUpdateAddon(menuId: string) {
  return useMenuMutation(
    menuId,
    async ({ addonId, ...input }: NameInput & { addonId: string }) => {
      const { name } = nameSchema.parse(input)
      const { error } = await supabase
        .from('addons')
        .update({ name })
        .eq('id', addonId)
      if (error) throw error
    },
  )
}

export function useDeleteAddon(menuId: string) {
  return useMenuMutation(menuId, async (addonId: string) => {
    const { error } = await supabase.from('addons').delete().eq('id', addonId)
    if (error) throw error
  })
}

const reorderBy = <T extends { id: string }>(rows: T[], ids: string[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

function useReorderMutation<TInput extends { itemId: string }>(
  menuId: string,
  mutationFn: (input: TInput) => Promise<void>,
  patchItem: (item: MenuItemDetail, input: TInput) => MenuItemDetail,
) {
  const queryClient = useQueryClient()
  const queryKey = menuQueries.detail(menuId).queryKey
  return useMutation({
    mutationFn,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(
        queryKey,
        (menu) =>
          menu && {
            ...menu,
            items: menu.items.map((item) =>
              item.id === input.itemId ? patchItem(item, input) : item,
            ),
          },
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}

export function useReorderOptionGroups(menuId: string) {
  return useReorderMutation(
    menuId,
    async (input: ReorderOptionGroupsInput) => {
      const { itemId, groupIds } = reorderOptionGroupsSchema.parse(input)
      const { error } = await supabase.rpc('reorder_option_groups', {
        p_item_id: itemId,
        p_group_ids: groupIds,
      })
      if (error) throw error
    },
    (item, { groupIds }) => ({
      ...item,
      option_groups: reorderBy(item.option_groups, groupIds),
    }),
  )
}

export function useReorderOptionChoices(menuId: string) {
  return useReorderMutation(
    menuId,
    async (input: ReorderOptionChoicesInput) => {
      const { groupId, choiceIds } = reorderOptionChoicesSchema.parse(input)
      const { error } = await supabase.rpc('reorder_option_choices', {
        p_group_id: groupId,
        p_choice_ids: choiceIds,
      })
      if (error) throw error
    },
    (item, { groupId, choiceIds }) => ({
      ...item,
      option_groups: item.option_groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              option_choices: reorderBy(group.option_choices, choiceIds),
            }
          : group,
      ),
    }),
  )
}

export function useReorderAddons(menuId: string) {
  return useReorderMutation(
    menuId,
    async (input: ReorderAddonsInput) => {
      const { itemId, addonIds } = reorderAddonsSchema.parse(input)
      const { error } = await supabase.rpc('reorder_addons', {
        p_item_id: itemId,
        p_addon_ids: addonIds,
      })
      if (error) throw error
    },
    (item, { addonIds }) => ({
      ...item,
      addons: reorderBy(item.addons, addonIds),
    }),
  )
}
