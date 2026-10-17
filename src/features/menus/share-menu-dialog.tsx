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
import { addMenuCollaboratorFormOptions } from '#/lib/forms/collaborator'
import { useAppForm } from '#/lib/forms/use-app-form'
import {
  menuCollaboratorQueries,
  useAddMenuCollaborator,
  useRemoveMenuCollaborator,
  useUpdateMenuCollaboratorRole,
} from '#/lib/queries/menu-collaborators'
import { Constants } from '#/lib/supabase/database.types'
import { menuRoleLabels, menuRoleOptions } from './collaborator-roles'

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something broke'

type ShareMenuDialogProps = {
  menuId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareMenuDialog({
  menuId,
  open,
  onOpenChange,
}: ShareMenuDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share menu</DialogTitle>
          <DialogDescription>
            Viewers can look at the menu. Editors can also change its dishes.
            Only you can share or delete it.
          </DialogDescription>
        </DialogHeader>
        <AddCollaboratorForm menuId={menuId} />
        <Suspense fallback={<Skeleton className="h-12" />}>
          <CollaboratorList menuId={menuId} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

function AddCollaboratorForm({ menuId }: { menuId: string }) {
  const addCollaborator = useAddMenuCollaborator(menuId)
  const form = useAppForm({
    ...addMenuCollaboratorFormOptions,
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
              options={menuRoleOptions}
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

function CollaboratorList({ menuId }: { menuId: string }) {
  const { data: collaborators } = useSuspenseQuery(
    menuCollaboratorQueries.list(menuId),
  )
  const updateRole = useUpdateMenuCollaboratorRole(menuId)
  const remove = useRemoveMenuCollaborator(menuId)

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
              items={menuRoleOptions}
              value={person.role}
              onValueChange={(role) => {
                const next = Constants.public.Enums.menu_collaborator_role.find(
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
                {Constants.public.Enums.menu_collaborator_role.map((role) => (
                  <SelectItem key={role} value={role}>
                    {menuRoleLabels[role]}
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
