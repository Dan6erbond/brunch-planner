import { InviteShell } from '#/components/layout/invite-shell'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'

export function InvitePending() {
  return (
    <InviteShell>
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-40" />
    </InviteShell>
  )
}

export function InviteError() {
  return (
    <InviteShell>
      <Alert variant="destructive">
        <AlertTitle>Couldn’t load this invite</AlertTitle>
        <AlertDescription>
          Check your connection and reload the page.
        </AlertDescription>
      </Alert>
    </InviteShell>
  )
}
