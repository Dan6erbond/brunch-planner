import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import { toggleShoppingCheckSchema } from '#/lib/schemas/shopping-list'
import { brunchKeys } from './keys'

export const shoppingListQueries = {
  checks: (brunchId: string) =>
    queryOptions({
      queryKey: brunchKeys.shoppingChecks(brunchId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('shopping_list_checks')
          .select('line_key')
          .eq('brunch_id', brunchId)
        if (error) throw error
        return data.map((row) => row.line_key)
      },
    }),
}

export function useToggleShoppingCheck(brunchId: string) {
  const queryClient = useQueryClient()
  const queryKey = shoppingListQueries.checks(brunchId).queryKey
  return useMutation({
    mutationFn: async (input: { lineKey: string; checked: boolean }) => {
      const { lineKey, checked } = toggleShoppingCheckSchema.parse(input)
      const { error } = checked
        ? await supabase
            .from('shopping_list_checks')
            .upsert(
              { brunch_id: brunchId, line_key: lineKey },
              { onConflict: 'brunch_id,line_key', ignoreDuplicates: true },
            )
        : await supabase
            .from('shopping_list_checks')
            .delete()
            .eq('brunch_id', brunchId)
            .eq('line_key', lineKey)
      if (error) throw error
    },
    onMutate: async ({ lineKey, checked }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (keys) => {
        const rest = (keys ?? []).filter((key) => key !== lineKey)
        return checked ? [...rest, lineKey] : rest
      })
      return { previous }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })
}
