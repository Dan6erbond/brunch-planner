import { queryOptions } from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import { profileKeys } from './keys'

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: profileKeys.me(),
      queryFn: async () => {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession()
        if (sessionError) throw sessionError
        const userId = sessionData.session?.user.id
        if (!userId) return null
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (error) throw error
        return data
      },
    }),
}
