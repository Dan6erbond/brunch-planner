import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '#/features/auth/login-form'
import { authQueries } from '#/lib/queries/auth'
import { redirectSearchSchema } from '#/lib/schemas/auth'

export const Route = createFileRoute('/login')({
  validateSearch: redirectSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.query(authQueries.session())
    if (session) {
      throw redirect({ href: search.redirect ?? '/' })
    }
  },
  component: Login,
})

function Login() {
  const search = Route.useSearch()
  return <LoginForm redirectTo={search.redirect} />
}
