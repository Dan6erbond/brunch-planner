import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import {
  nameSchema,
  optionGroupSchema,
  type NameInput,
  type OptionGroupInput,
} from '#/lib/schemas/menu'
import { menuKeys } from './keys'
import { menuQueries } from './menus'

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
