import { createFileRoute } from '@tanstack/react-router'
import { MenuEditor } from '#/features/menus/menu-editor'
import { MenuEditorPending, MenusError } from '#/features/menus/menu-states'
import { menuQueries } from '#/lib/queries/menus'

export const Route = createFileRoute('/_authed/menus/$menuId')({
  loader: ({ context, params }) =>
    context.queryClient.query(menuQueries.detail(params.menuId)),
  pendingComponent: MenuEditorPending,
  errorComponent: MenusError,
  component: MenuEditorRoute,
})

function MenuEditorRoute() {
  const { menuId } = Route.useParams()
  return <MenuEditor menuId={menuId} />
}
