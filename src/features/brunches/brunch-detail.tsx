import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CopyIcon,
  MapPinIcon,
  PencilIcon,
  SendIcon,
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
import { Input } from '#/components/ui/input'
import {
  brunchQueries,
  useDeleteBrunch,
  useSendInvites,
  useUpdateBrunch,
} from '#/lib/queries/brunches'
import type { BrunchRow } from '#/lib/schemas/brunch'
import { ConfirmDeleteDialog } from '#/features/menus/confirm-delete-dialog'
import { BrunchFormDialog } from './brunch-form-dialog'
import { formatStartsAt } from './brunch-format'
import { BrunchStatusBadge } from './brunch-status-badge'
import { ResponsesSection } from './responses-section'

export function BrunchDetail({ brunchId }: { brunchId: string }) {
  const { data: brunch } = useSuspenseQuery(brunchQueries.detail(brunchId))
  if (!brunch) {
    return (
      <div className="grid justify-items-start gap-3">
        <p className="font-medium">Brunch not found</p>
        <BackLink />
      </div>
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
  const updateBrunch = useUpdateBrunch(brunch.id, {
    lockMenu: brunch.status !== 'draft',
  })
  const [editing, setEditing] = useState(false)
  const [confirmingSend, setConfirmingSend] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isDraft = brunch.status === 'draft'
  const canSend = isDraft && brunch.starts_at !== null
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
          {isDraft && (
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
          <Button
            variant="outline"
            onClick={() => {
              setEditing(true)
            }}
          >
            <PencilIcon />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDeleting(true)
            }}
          >
            <Trash2Icon />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 text-sm">
          <p className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            {formatStartsAt(brunch.starts_at)}
          </p>
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
          This brunch is a draft. Guests can’t see it until you send invites.
        </p>
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

      <ResponsesSection
        brunchId={brunch.id}
        menuId={brunch.menu_id}
        isDraft={isDraft}
      />

      <BrunchFormDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit brunch"
        description={
          isDraft
            ? 'Change any detail while it’s still a draft.'
            : 'The menu is locked once invites have been sent.'
        }
        submitLabel="Save"
        lockMenu={!isDraft}
        initialValues={{
          title: brunch.title,
          menuId: brunch.menu_id,
          startsAt: brunch.starts_at ?? '',
          location: brunch.location ?? '',
          description: brunch.description ?? '',
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
