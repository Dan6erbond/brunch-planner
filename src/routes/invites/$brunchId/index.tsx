import { createFileRoute } from '@tanstack/react-router'
import { InvitePage } from '#/features/invites/invite-page'
import { InviteError, InvitePending } from '#/features/invites/invite-states'
import { inviteQueries } from '#/lib/queries/invites'

export const Route = createFileRoute('/invites/$brunchId/')({
  loader: async ({ context, params }) => {
    await context.queryClient.query(inviteQueries.detail(params.brunchId))
  },
  pendingComponent: InvitePending,
  errorComponent: InviteError,
  component: InviteRoute,
})

function InviteRoute() {
  const { brunchId } = Route.useParams()
  return <InvitePage brunchId={brunchId} />
}
