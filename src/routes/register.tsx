import { createFileRoute, redirect } from '@tanstack/react-router'
import { RegisterForm } from '#/features/auth/register-form'
import { authQueries } from '#/lib/queries/auth'

export const Route = createFileRoute('/register')({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.query(authQueries.session())
    if (session) {
      throw redirect({ to: '/' })
    }
  },
  component: RegisterForm,
})
