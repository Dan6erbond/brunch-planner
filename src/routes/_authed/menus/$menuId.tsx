import { createFileRoute } from '@tanstack/react-router'
import { MenuEditor } from '#/features/menus/menu-editor'
import { MenuEditorPending, MenusError } from '#/features/menus/menu-states'
import { menuCollaboratorQueries } from '#/lib/queries/menu-collaborators'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/menus/$menuId')({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query(menuQueries.detail(params.menuId)),
      context.queryClient.query(menuCollaboratorQueries.role(params.menuId)),
    ])
  },
  pendingComponent: MenuEditorPending,
  errorComponent: MenusError,
  component: MenuEditorRoute,
})

function MenuEditorRoute() {
  const { menuId } = Route.useParams()
  return <MenuEditor menuId={menuId} />
}
