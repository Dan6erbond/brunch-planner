import { createFileRoute } from '@tanstack/react-router'
import { MenuList } from '#/features/menus/menu-list'
import { MenusError, MenusPending } from '#/features/menus/menu-states'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/menus/')({
  loader: ({ context }) => context.queryClient.query(menuQueries.list()),
  pendingComponent: MenusPending,
  errorComponent: MenusError,
  component: MenuList,
})
