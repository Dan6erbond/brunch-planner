import { Badge } from '#/components/ui/badge'
import type { BrunchStatus } from '#/lib/schemas/brunch'

export const statusLabels: Record<BrunchStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
}

const statusVariants: Record<
  BrunchStatus,
  'secondary' | 'default' | 'outline'
> = {
  draft: 'secondary',
  open: 'default',
  closed: 'outline',
}

export function BrunchStatusBadge({ status }: { status: BrunchStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
}
