import { createFileRoute } from '@tanstack/react-router'
import { BrunchDetail } from '#/features/brunches/brunch-detail'
import { BrunchDetailPending } from '#/features/brunches/brunch-states'
import { MenusError } from '#/features/menus/menu-states'
import { ensureUserId } from '#/lib/queries/auth'
import { brunchCollaboratorQueries } from '#/lib/queries/brunch-collaborators'
import { brunchQueries } from '#/lib/queries/brunches'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/brunches/$brunchId')({
  loader: async ({ context, params }) => {
    const userId = await ensureUserId(context.queryClient)
    const [brunch] = await Promise.all([
      context.queryClient.query(brunchQueries.detail(params.brunchId)),
      context.queryClient.query(menuQueries.list(userId)),
      context.queryClient.query(
        brunchCollaboratorQueries.role(params.brunchId),
      ),
    ])
    if (brunch && brunch.status !== 'draft') {
      await Promise.all([
        context.queryClient.query(brunchQueries.responses(brunch.id)),
        context.queryClient.query(menuQueries.detail(brunch.menu_id)),
      ])
    }
  },
  pendingComponent: BrunchDetailPending,
  errorComponent: MenusError,
  component: BrunchDetailRoute,
})

function BrunchDetailRoute() {
  const { brunchId } = Route.useParams()
  return <BrunchDetail brunchId={brunchId} />
}
