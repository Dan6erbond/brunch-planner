import type { BrunchStatus } from '#/lib/schemas/brunch'
import { BrunchStatusBadge, statusLabels } from './brunch-status-badge'
import {
  CalendarIcon,
  ChevronDownIcon,
  MapPinIcon,
  PlusIcon,
  UtensilsIcon,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Link, useNavigate } from '@tanstack/react-router'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { useUserId } from '#/lib/queries/auth'
import {
  brunchQueries,
  type BrunchListRow,
  useCreateBrunch,
} from '#/lib/queries/brunches'
import { brunchRoleLabels } from './collaborator-roles'
import { formatStartsAt, splitUpcomingAndPast } from './brunch-format'

import { BrunchFormDialog } from './brunch-form-dialog'
import { Button } from '#/components/ui/button'
import { toast } from 'sonner'
import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'

type StatusFilter = BrunchStatus | 'all'

const filters: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  ...(Object.keys(statusLabels) as BrunchStatus[]).map((value) => ({
    value,
    label: statusLabels[value],
  })),
]

export function BrunchList() {
  const userId = useUserId()
  const { data: brunches } = useSuspenseQuery(brunchQueries.list(userId))
  const navigate = useNavigate()
  const createBrunch = useCreateBrunch()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')

  const visible =
    filter === 'all' ? brunches : brunches.filter((b) => b.status === filter)
  const owned = splitUpcomingAndPast(visible.filter((b) => b.role === 'owner'))
  const shared = splitUpcomingAndPast(visible.filter((b) => b.role !== 'owner'))

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Brunches</h1>
        <Button
          onClick={() => {
            setCreating(true)
          }}
        >
          <PlusIcon />
          New brunch
        </Button>
      </div>

      {brunches.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <p className="font-medium">No brunches yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Pick a menu and a date, then send the invite link to your guests.
          </p>
          <Button
            onClick={() => {
              setCreating(true)
            }}
          >
            <PlusIcon />
            Plan your first brunch
          </Button>
        </div>
      ) : (
        <>
          <ToggleGroup
            variant="outline"
            size="sm"
            className="w-fit max-w-full"
            value={[filter]}
            onValueChange={(next) => {
              const [value] = next
              const match = filters.find((f) => f.value === value)
              if (match) setFilter(match.value)
            }}
          >
            {filters.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="px-3">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No {filter === 'all' ? '' : statusLabels[filter].toLowerCase()}{' '}
              brunches.
            </p>
          )}
          <BrunchGroups upcoming={owned.upcoming} past={owned.past} />
          {shared.upcoming.length + shared.past.length > 0 && (
            <section className="grid gap-4">
              <h2 className="text-lg font-medium">Shared with me</h2>
              <BrunchGroups upcoming={shared.upcoming} past={shared.past} />
            </section>
          )}
        </>
      )}

      <BrunchFormDialog
        open={creating}
        onOpenChange={setCreating}
        title="New brunch"
        description="Pick a menu and a time. It stays a draft until you send invites."
        submitLabel="Create brunch"
        onSubmit={async (value) => {
          const brunch = await createBrunch.mutateAsync(value)
          toast.success('Brunch created')
          await navigate({
            to: '/brunches/$brunchId',
            params: { brunchId: brunch.id },
          })
        }}
      />
    </div>
  )
}

function BrunchGroups({
  upcoming,
  past,
}: {
  upcoming: BrunchListRow[]
  past: BrunchListRow[]
}) {
  return (
    <>
      {upcoming.length > 0 && <BrunchCards brunches={upcoming} />}
      {past.length > 0 && (
        <Collapsible className="grid gap-3">
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                className="group w-fit justify-start px-2"
              />
            }
          >
            <ChevronDownIcon className="transition-transform group-data-[panel-open]:rotate-180" />
            Past brunches ({past.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <BrunchCards brunches={past} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  )
}

function BrunchCards({ brunches }: { brunches: BrunchListRow[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {brunches.map((brunch) => (
        <li key={brunch.id}>
          <BrunchCard brunch={brunch} />
        </li>
      ))}
    </ul>
  )
}

function BrunchCard({ brunch }: { brunch: BrunchListRow }) {
  return (
    <Card
      render={
        <Link to="/brunches/$brunchId" params={{ brunchId: brunch.id }} />
      }
      className="h-full transition-colors outline-none hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 truncate">{brunch.title}</CardTitle>
          <BrunchStatusBadge status={brunch.status} />
        </div>
        <ul className="grid gap-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0" />
            {formatStartsAt(brunch.starts_at)}
          </li>
          {brunch.location && (
            <li className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" />
              <span className="truncate">{brunch.location}</span>
            </li>
          )}
          {brunch.menus && (
            <li className="flex items-center gap-2">
              <UtensilsIcon className="size-4 shrink-0" />
              <span className="truncate">{brunch.menus.name}</span>
            </li>
          )}
          {brunch.role !== 'owner' && (
            <li>
              <Badge variant="secondary">{brunchRoleLabels[brunch.role]}</Badge>
            </li>
          )}
        </ul>
      </CardHeader>
    </Card>
  )
}
