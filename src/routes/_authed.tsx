import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '#/components/layout/app-shell'
import { authQueries } from '#/lib/queries/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.query(authQueries.session())
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
