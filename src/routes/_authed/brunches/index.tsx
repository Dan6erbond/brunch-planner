import { createFileRoute } from '@tanstack/react-router'
import { BrunchList } from '#/features/brunches/brunch-list'
import { BrunchesPending } from '#/features/brunches/brunch-states'
import { MenusError } from '#/features/menus/menu-states'
import { brunchQueries } from '#/lib/queries/brunches'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/brunches/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(brunchQueries.list()),
      context.queryClient.query(menuQueries.list()),
    ])
  },
  pendingComponent: BrunchesPending,
  errorComponent: MenusError,
  component: BrunchList,
})
