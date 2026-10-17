import { createFileRoute } from '@tanstack/react-router'
import { MenuList } from '#/features/menus/menu-list'
import { MenusError, MenusPending } from '#/features/menus/menu-states'
import { ensureUserId } from '#/lib/queries/auth'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/menus/')({
  loader: async ({ context }) => {
    const userId = await ensureUserId(context.queryClient)
    await context.queryClient.query(menuQueries.list(userId))
  },
  pendingComponent: MenusPending,
  errorComponent: MenusError,
  component: MenuList,
})
