import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { FieldGroup } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { addBrunchCollaboratorFormOptions } from '#/lib/forms/collaborator'
import { useAppForm } from '#/lib/forms/use-app-form'
import {
  brunchCollaboratorQueries,
  useAddBrunchCollaborator,
  useRemoveBrunchCollaborator,
  useUpdateBrunchCollaboratorRole,
} from '#/lib/queries/brunch-collaborators'
import { Constants } from '#/lib/supabase/database.types'
import { brunchRoleLabels, brunchRoleOptions } from './collaborator-roles'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something broke'

type ShareBrunchDialogProps = {
  brunchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareBrunchDialog({
  brunchId,
  open,
  onOpenChange,
}: ShareBrunchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share brunch</DialogTitle>
          <DialogDescription>
            Viewers can see the brunch, its responses and the shopping list.
            Co-hosts can also edit it, send invites and are shown to guests.
            Only you can share or delete it.
          </DialogDescription>
        </DialogHeader>
        <AddBrunchCollaboratorForm brunchId={brunchId} />
        <Suspense fallback={<Skeleton className="h-12" />}>
          <CollaboratorList brunchId={brunchId} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

function AddBrunchCollaboratorForm({ brunchId }: { brunchId: string }) {
  const addCollaborator = useAddBrunchCollaborator(brunchId)
  const form = useAppForm({
    ...addBrunchCollaboratorFormOptions,
    onSubmit: async ({ value, formApi }) => {
      try {
        await addCollaborator.mutateAsync(value)
        toast.success('Person added')
        formApi.reset()
      } catch (error) {
        toast.error(errorMessage(error))
      }
    },
  })

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="@container grid gap-3 sm:grid-cols-[1fr_8rem]">
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label="Email"
              type="email"
              autoComplete="off"
              placeholder="friend@example.com"
            />
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <field.SelectField
              label="Role"
              placeholder="Role"
              options={brunchRoleOptions}
            />
          )}
        </form.AppField>
      </FieldGroup>
      <form.AppForm>
        <form.SubmitButton label="Add" pendingLabel="Adding…" />
      </form.AppForm>
    </form>
  )
}

function CollaboratorList({ brunchId }: { brunchId: string }) {
  const { data: collaborators } = useSuspenseQuery(
    brunchCollaboratorQueries.list(brunchId),
  )
  const updateRole = useUpdateBrunchCollaboratorRole(brunchId)
  const remove = useRemoveBrunchCollaborator(brunchId)

  if (collaborators.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not shared with anyone yet.
      </p>
    )
  }

  return (
    <ul className="grid gap-2">
      {collaborators.map((person) => {
        const name = person.display_name || person.email
        return (
          <li key={person.user_id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              {name !== person.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {person.email}
                </p>
              )}
            </div>
            <Select
              items={brunchRoleOptions}
              value={person.role}
              onValueChange={(role) => {
                const next =
                  Constants.public.Enums.brunch_collaborator_role.find(
                    (candidate) => candidate === role,
                  )
                if (!next) return
                updateRole.mutate(
                  { userId: person.user_id, role: next },
                  {
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  },
                )
              }}
            >
              <SelectTrigger className="w-28" aria-label={`Role of ${name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {Constants.public.Enums.brunch_collaborator_role.map((role) => (
                  <SelectItem key={role} value={role}>
                    {brunchRoleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              disabled={remove.isPending}
              onClick={() => {
                remove.mutate(person.user_id, {
                  onError: (error) => {
                    toast.error(error.message)
                  },
                })
              }}
            >
              <Trash2Icon />
              <span className="sr-only">Remove {name}</span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
