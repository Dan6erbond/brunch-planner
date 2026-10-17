import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  LogOutIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PencilIcon,
  SendIcon,
  Share2Icon,
  Trash2Icon,
  UtensilsIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { formatDayTime } from '#/lib/date'
import { useUserId } from '#/lib/queries/auth'
import {
  useBrunchRole,
  useRemoveBrunchCollaborator,
} from '#/lib/queries/brunch-collaborators'
import {
  brunchQueries,
  useDeleteBrunch,
  useSendInvites,
  useUpdateBrunch,
} from '#/lib/queries/brunches'
import { MIN_POLL_SLOTS, type BrunchRow } from '#/lib/schemas/brunch'
import { NoAccess } from '#/components/no-access'
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { DatePollCard } from './date-poll-card'
import { BrunchFormDialog } from './brunch-form-dialog'
import { formatStartsAt } from './brunch-format'
import { BrunchStatusBadge } from './brunch-status-badge'
import { ResponsesSection } from './responses-section'
import { ShareBrunchDialog } from './share-brunch-dialog'

export function BrunchDetail({ brunchId }: { brunchId: string }) {
  const { data: brunch } = useSuspenseQuery(brunchQueries.detail(brunchId))
  if (!brunch) {
    return (
      <NoAccess
        title="No access or not found"
        backTo="/brunches"
        backLabel="All brunches"
      />
    )
  }
  return <BrunchView brunch={brunch} />
}

function BackLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-fit"
      render={<Link to="/brunches" />}
    >
      <ArrowLeftIcon />
      All brunches
    </Button>
  )
}

function BrunchView({ brunch }: { brunch: BrunchRow }) {
  const navigate = useNavigate()
  const sendInvites = useSendInvites()
  const deleteBrunch = useDeleteBrunch()
  const userId = useUserId()
  const role = useBrunchRole(brunch.id)
  const leaveBrunch = useRemoveBrunchCollaborator(brunch.id)
  const isOwner = role === 'owner'
  const canManage = isOwner || role === 'co_host'
  const isDraft = brunch.status === 'draft'
  const lockMenu = !isDraft || !isOwner
  const isPoll = brunch.scheduling === 'poll'
  const pollFrozen = isPoll && brunch.starts_at !== null
  const { data: dateOptions } = useSuspenseQuery(
    brunchQueries.dateOptions(brunch.id),
  )
  const updateBrunch = useUpdateBrunch(brunch.id, {
    menu: lockMenu,
    scheduling: !isDraft,
    slots: pollFrozen,
  })
  const [sharing, setSharing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingSend, setConfirmingSend] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canSend =
    isDraft &&
    (isPoll ? dateOptions.length >= MIN_POLL_SLOTS : brunch.starts_at !== null)
  const inviteUrl = `${window.location.origin}/invites/${brunch.id}`

  return (
    <div className="grid gap-6">
      <BackLink />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          <h1 className="text-2xl font-semibold break-words">{brunch.title}</h1>
          <div>
            <BrunchStatusBadge status={brunch.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && isDraft && (
            <Button
              disabled={!canSend}
              onClick={() => {
                setConfirmingSend(true)
              }}
            >
              <SendIcon />
              Send invites
            </Button>
          )}
          {canManage && (
            <Button
              variant="outline"
              onClick={() => {
                setEditing(true)
              }}
            >
              <PencilIcon />
              Edit
            </Button>
          )}
          {role !== 'none' && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="icon" />}
              >
                <MoreVerticalIcon />
                <span className="sr-only">Brunch actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setSharing(true)
                      }}
                    >
                      <Share2Icon />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setDeleting(true)
                      }}
                    >
                      <Trash2Icon />
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      leaveBrunch.mutate(userId, {
                        onSuccess: () => {
                          toast.success('You left the brunch')
                          void navigate({ to: '/brunches' })
                        },
                        onError: (error) => {
                          toast.error(error.message)
                        },
                      })
                    }}
                  >
                    <LogOutIcon />
                    Leave
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 text-sm">
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            {isPoll && brunch.starts_at === null
              ? 'Date to be decided by poll'
              : formatStartsAt(brunch.starts_at)}
          </p>
          {brunch.responses_close_at && (
            <p className="flex items-center gap-2">
              <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
              {brunch.status === 'closed' ? 'Closed' : 'Closes'}{' '}
              {formatDayTime(brunch.responses_close_at)}
            </p>
          )}
          {brunch.location && (
            <p className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
              {brunch.location}
            </p>
          )}
          {brunch.menus && (
            <p className="flex items-center gap-2">
              <UtensilsIcon className="size-4 shrink-0 text-muted-foreground" />
              <Link
                to="/menus/$menuId"
                params={{ menuId: brunch.menu_id }}
                className="underline underline-offset-4"
              >
                {brunch.menus.name}
              </Link>
            </p>
          )}
          {brunch.description && (
            <p className="whitespace-pre-wrap text-muted-foreground">
              {brunch.description}
            </p>
          )}
        </CardContent>
      </Card>

      {isDraft ? (
        <p className="text-sm text-muted-foreground">
          This brunch is a draft. Guests can’t see it until invites are sent.
        </p>
      ) : brunch.invite_only ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite only</CardTitle>
            <CardDescription>
              Guests need their own link. Add them under Responses and copy each
              person’s link to send it.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
            <CardDescription>
              Anyone with this link can respond. No account needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={inviteUrl} aria-label="Invite link" />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl).then(
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
              Copy
            </Button>
          </CardContent>
        </Card>
      )}

      {isPoll && (
        <DatePollCard
          brunchId={brunch.id}
          startsAt={brunch.starts_at}
          isDraft={isDraft}
          canManage={canManage}
        />
      )}

      <ResponsesSection
        brunchId={brunch.id}
        menuId={brunch.menu_id}
        isDraft={isDraft}
        inviteOnly={brunch.invite_only}
        canManage={canManage}
      />

      {isOwner && (
        <ShareBrunchDialog
          brunchId={brunch.id}
          open={sharing}
          onOpenChange={setSharing}
        />
      )}

      <BrunchFormDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit brunch"
        description={
          lockMenu
            ? 'The menu and the fixed or poll choice are locked once invites are sent, and only the owner can change the menu.'
            : 'Change any detail while it’s still a draft.'
        }
        submitLabel="Save"
        lockMenu={lockMenu}
        lockScheduling={!isDraft}
        lockSlots={pollFrozen}
        initialValues={{
          title: brunch.title,
          menuId: brunch.menu_id,
          scheduling: brunch.scheduling,
          startsAt: brunch.starts_at ?? '',
          slots: dateOptions.map((option) => ({
            id: option.id,
            startsAt: option.starts_at,
          })),
          responsesCloseAt: brunch.responses_close_at ?? '',
          location: brunch.location ?? '',
          description: brunch.description ?? '',
          inviteOnly: brunch.invite_only,
        }}
        onSubmit={async (value) => {
          await updateBrunch.mutateAsync(value)
          toast.success('Brunch updated')
        }}
      />

      <AlertDialog open={confirmingSend} onOpenChange={setConfirmingSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send invites?</AlertDialogTitle>
            <AlertDialogDescription>
              This makes the invite link live. You can still edit details
              afterwards, but the menu will be locked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendInvites.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={sendInvites.isPending}
              onClick={() => {
                sendInvites.mutate(brunch.id, {
                  onSuccess: () => {
                    toast.success('Invites sent. Copy the link to share it.')
                  },
                  onError: (error) => {
                    toast.error(error.message)
                  },
                  onSettled: () => {
                    setConfirmingSend(false)
                  },
                })
              }}
            >
              {sendInvites.isPending ? 'Sending…' : 'Send invites'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${brunch.title}”?`}
        description={
          isDraft
            ? 'It can’t be undone.'
            : 'Guests will lose access to the invite link and all responses are deleted. It can’t be undone.'
        }
        pending={deleteBrunch.isPending}
        onConfirm={() => {
          deleteBrunch.mutate(brunch.id, {
            onSuccess: () => {
              toast.success('Brunch deleted')
              void navigate({ to: '/brunches' })
            },
            onError: (error) => {
              toast.error(error.message)
            },
            onSettled: () => {
              setDeleting(false)
            },
          })
        }}
      />
    </div>
  )
}
