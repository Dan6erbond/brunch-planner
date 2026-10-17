import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import type { TablesInsert } from '#/lib/supabase/database.types'
import {
  ingredientParentSchema,
  ingredientSchemaFor,
  type IngredientInput,
  type IngredientParent,
  type IngredientParentKind,
} from '#/lib/schemas/ingredient'
import { menuKeys } from './keys'

const parentColumns = {
  item: (id: string) => ({ item_id: id }),
  option_choice: (id: string) => ({ option_choice_id: id }),
  addon: (id: string) => ({ addon_id: id }),
} satisfies Record<
  IngredientParent['kind'],
  (id: string) => Partial<TablesInsert<'ingredients'>>
>

const toColumns = (kind: IngredientParentKind, input: IngredientInput) => {
  const { name, quantity, unit } = ingredientSchemaFor(kind).parse(input)
  return {
    name: name === '' ? null : name,
    quantity: quantity === '' ? null : Number(quantity),
    unit: unit === '' ? null : unit,
  }
}

export function useCreateIngredient(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      parent,
      ...input
    }: IngredientInput & { parent: IngredientParent }) => {
      const { kind, id } = ingredientParentSchema.parse(parent)
      const row: TablesInsert<'ingredients'> = {
        ...toColumns(kind, input),
        ...parentColumns[kind](id),
      }
      const { error } = await supabase.from('ingredients').insert(row)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

export function useUpdateIngredient(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ingredientId,
      kind,
      ...input
    }: IngredientInput & {
      ingredientId: string
      kind: IngredientParentKind
    }) => {
      const { error } = await supabase
        .from('ingredients')
        .update(toColumns(kind, input))
        .eq('id', ingredientId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}

export function useDeleteIngredient(menuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredientId)
      if (error) throw error
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: menuKeys.detail(menuId) }),
  })
}
