import { ConfirmDialog } from '#/components/confirm-dialog'

type ConfirmDeleteDialogProps = Omit<
  React.ComponentProps<typeof ConfirmDialog>,
  'confirmLabel' | 'pendingLabel' | 'variant'
>

export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      variant="destructive"
    />
  )
}
