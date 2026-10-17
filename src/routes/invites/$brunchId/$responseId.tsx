import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InvitePage } from '#/features/invites/invite-page'
import { InviteError, InvitePending } from '#/features/invites/invite-states'
import { inviteQueries } from '#/lib/queries/invites'

export const Route = createFileRoute('/invites/$brunchId/$responseId')({
  validateSearch: z.object({ saved: z.boolean().optional() }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query(inviteQueries.detail(params.brunchId)),
      context.queryClient.query(inviteQueries.response(params.responseId)),
    ])
  },
  pendingComponent: InvitePending,
  errorComponent: InviteError,
  component: InviteResponseRoute,
})

function InviteResponseRoute() {
  const { brunchId, responseId } = Route.useParams()
  const { saved } = Route.useSearch()
  return (
    <InvitePage brunchId={brunchId} responseId={responseId} saved={saved} />
  )
}
