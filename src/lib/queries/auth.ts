import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '#/lib/supabase/client'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '#/lib/schemas/auth'
import { authKeys, profileKeys } from './keys'

export const authQueries = {
  session: () =>
    queryOptions({
      queryKey: authKeys.session(),
      queryFn: async () => {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data.session
      },
      staleTime: Infinity,
    }),
}

export function subscribeAuthSession(queryClient: QueryClient) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    queryClient.setQueryData(authKeys.session(), session)
  })
  return () => data.subscription.unsubscribe()
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error } = await supabase.auth.signInWithPassword(
        loginSchema.parse(input),
      )
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.session(), data.session)
      void queryClient.invalidateQueries({ queryKey: profileKeys.all })
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { displayName, email, password } = registerSchema.parse(input)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.session) {
        queryClient.setQueryData(authKeys.session(), data.session)
        void queryClient.invalidateQueries({ queryKey: profileKeys.all })
      }
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(authKeys.session(), null)
    },
  })
}
