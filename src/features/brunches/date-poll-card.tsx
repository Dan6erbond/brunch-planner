import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDownIcon, TrophyIcon } from 'lucide-react'
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
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { formatDayTime } from '#/lib/date'
import { brunchQueries, usePickDateWinner } from '#/lib/queries/brunches'
import { tallyPoll } from './poll-tally'

type DatePollCardProps = {
  brunchId: string
  startsAt: string | null
  isDraft: boolean
  canManage: boolean
}

export function DatePollCard({
  brunchId,
  startsAt,
  isDraft,
  canManage,
}: DatePollCardProps) {
  const { data: options } = useSuspenseQuery(
    brunchQueries.dateOptions(brunchId),
  )
  const frozen = startsAt !== null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Date poll</CardTitle>
        <CardDescription>
          {frozen
            ? 'A date is picked. The poll is closed.'
            : isDraft
              ? 'Guests can vote on these dates once invites are sent.'
              : 'Guests vote yes or maybe on each date. Pick the winner when you are ready.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No dates yet. Add them with Edit.
          </p>
        ) : isDraft ? (
          <ul className="grid gap-2 text-sm">
            {options.map((option) => (
              <li key={option.id} className="rounded-lg border p-3">
                {formatDayTime(option.starts_at)}
              </li>
            ))}
          </ul>
        ) : (
          <PollTally
            brunchId={brunchId}
            startsAt={startsAt}
            canPick={canManage && !frozen}
          />
        )}
      </CardContent>
    </Card>
  )
}

function PollTally({
  brunchId,
  startsAt,
  canPick,
}: {
  brunchId: string
  startsAt: string | null
  canPick: boolean
}) {
  const { data: options } = useSuspenseQuery(
    brunchQueries.dateOptions(brunchId),
  )
  const { data: responses } = useSuspenseQuery(
    brunchQueries.responses(brunchId),
  )
  const pickWinner = usePickDateWinner(brunchId)
  const [picking, setPicking] = useState<string | null>(null)
  const rows = tallyPoll(options, responses)
  const winnerTime = startsAt ? new Date(startsAt).getTime() : null
  const picked = rows.find((row) => row.id === picking)

  return (
    <>
      <ul className="grid gap-2">
        {rows.map((row) => {
          const isWinner =
            winnerTime !== null &&
            new Date(row.starts_at).getTime() === winnerTime
          const isLeading = winnerTime === null && row.leading
          return (
            <li
              key={row.id}
              className={`rounded-lg border ${isWinner || isLeading ? 'border-primary bg-primary/5' : ''}`}
            >
              <Collapsible disabled={row.votes.length === 0}>
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                    <span className="grid gap-1">
                      <span className="font-medium">
                        {formatDayTime(row.starts_at)}
                      </span>
                      <span className="flex flex-wrap gap-1.5 text-xs">
                        <Badge variant="default">{row.yes} yes</Badge>
                        <Badge variant="secondary">{row.maybe} maybe</Badge>
                        {isWinner && (
                          <Badge variant="outline">
                            <TrophyIcon />
                            Picked
                          </Badge>
                        )}
                        {isLeading && <Badge variant="outline">Leading</Badge>}
                      </span>
                    </span>
                    {row.votes.length > 0 && (
                      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  {canPick && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPicking(row.id)
                      }}
                    >
                      Pick winner
                    </Button>
                  )}
                </div>
                <CollapsibleContent className="grid gap-1 border-t p-3 text-sm">
                  {row.votes.map((vote) => (
                    <p
                      key={`${vote.guest}:${vote.availability}`}
                      className="flex justify-between gap-3"
                    >
                      <span className="break-words">{vote.guest}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {vote.availability === 'yes' ? 'Yes' : 'Maybe'}
                      </span>
                    </p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          )
        })}
      </ul>

      <AlertDialog
        open={picked !== undefined}
        onOpenChange={(open) => {
          if (!open) setPicking(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pick this date?</AlertDialogTitle>
            <AlertDialogDescription>
              {picked ? formatDayTime(picked.starts_at) : ''} becomes the date
              of the brunch. The poll closes and guests can no longer change
              their votes. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pickWinner.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pickWinner.isPending}
              onClick={() => {
                if (!picking) return
                pickWinner.mutate(picking, {
                  onSuccess: () => {
                    toast.success('Date picked')
                  },
                  onError: (error) => {
                    toast.error(error.message)
                  },
                  onSettled: () => {
                    setPicking(null)
                  },
                })
              }}
            >
              {pickWinner.isPending ? 'Picking…' : 'Pick date'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
