import { useSuspenseQuery } from '@tanstack/react-query'
import {
  CalendarIcon,
  CheckCircle2Icon,
  CopyIcon,
  MapPinIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { InviteShell } from '#/components/layout/invite-shell'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { formatStartsAt } from '#/features/brunches/brunch-format'
import { inviteQueries } from '#/lib/queries/invites'
import type { Invite, SavedResponse } from '#/lib/schemas/invite'
import { RsvpForm } from './rsvp-form'

type InvitePageProps = {
  brunchId: string
  responseId?: string
  saved?: boolean
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <InviteShell>
      <Alert>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    </InviteShell>
  )
}

export function InvitePage({ brunchId, responseId, saved }: InvitePageProps) {
  const { data: invite } = useSuspenseQuery(inviteQueries.detail(brunchId))
  if (!invite) {
    return (
      <Notice title="Invite not found">
        This link doesn’t work. It may be wrong, or the host hasn’t sent the
        invites yet.
      </Notice>
    )
  }
  if (responseId) {
    return (
      <ResponsePage invite={invite} responseId={responseId} saved={saved} />
    )
  }
  if (invite.invite_only) {
    return (
      <Notice title="This brunch needs a personal link">
        The host shares a separate link with each guest. Ask them for yours.
      </Notice>
    )
  }
  return (
    <InviteShell>
      <InviteDetails invite={invite} />
      <InviteBody invite={invite} response={null} />
    </InviteShell>
  )
}

function ResponsePage({
  invite,
  responseId,
  saved,
}: {
  invite: Invite
  responseId: string
  saved?: boolean
}) {
  const { data: response } = useSuspenseQuery(
    inviteQueries.response(responseId),
  )
  if (response?.brunch_id !== invite.id) {
    return (
      <Notice title="Response not found">
        This link doesn’t match a response for this brunch.
      </Notice>
    )
  }
  return (
    <InviteShell>
      <InviteDetails invite={invite} />
      {saved && <SavedNotice />}
      <InviteBody invite={invite} response={response} />
    </InviteShell>
  )
}

function SavedNotice() {
  const link = window.location.origin + window.location.pathname
  return (
    <Alert>
      <CheckCircle2Icon />
      <AlertTitle>Response saved</AlertTitle>
      <AlertDescription className="grid gap-3">
        Bookmark this page to change your answer later.
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label="Your response link" />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(link).then(
                () => {
                  toast.success('Link copied')
                },
                () => {
                  toast.error('Couldn’t copy the link')
                },
              )
            }}
          >
            <CopyIcon />
            Copy link
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

function InviteDetails({ invite }: { invite: Invite }) {
  return (
    <header className="grid gap-3">
      <h1 className="text-3xl font-semibold break-words">{invite.title}</h1>
      {invite.host_name && (
        <p className="text-muted-foreground">Hosted by {invite.host_name}</p>
      )}
      <p className="flex items-center gap-2">
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        {invite.starts_at
          ? formatStartsAt(invite.starts_at)
          : 'Date to be decided'}
      </p>
      {invite.location && (
        <p className="flex items-center gap-2">
          <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
          {invite.location}
        </p>
      )}
      {invite.description && (
        <p className="whitespace-pre-wrap text-muted-foreground">
          {invite.description}
        </p>
      )}
    </header>
  )
}

function InviteBody({
  invite,
  response,
}: {
  invite: Invite
  response: SavedResponse | null
}) {
  if (invite.status === 'closed') {
    return (
      <Alert>
        <AlertTitle>Responses are closed</AlertTitle>
        <AlertDescription>
          The host isn’t taking new answers for this brunch.
        </AlertDescription>
      </Alert>
    )
  }
  return <RsvpForm key={response?.id} invite={invite} response={response} />
}
