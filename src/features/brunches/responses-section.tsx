import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDownIcon, CopyIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
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
import { ConfirmDeleteDialog } from '#/components/confirm-delete-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { formatShortDayTime } from '#/lib/date'
import { brunchQueries, type BrunchResponse } from '#/lib/queries/brunches'
import { useRemoveGuest } from '#/lib/queries/guests'
import { menuQueries, type MenuDetail } from '#/lib/queries/menus'
import {
  countGuests,
  describePicks,
  guestStatus,
  guestStatusLabels,
  type GuestStatus,
  summarizeItems,
} from './response-summary'
import { AddGuestForm } from './add-guest-form'
import {
  buildShoppingList,
  formatAmount,
  isShoppingListEmpty,
  ITEMS_WITHOUT_INGREDIENTS_LABEL,
  shoppingListToText,
} from './shopping-list'

type ManageProps = { inviteOnly: boolean; canManage: boolean }

const guestLink = (brunchId: string, responseId: string) =>
  `${window.location.origin}/invites/${brunchId}/${responseId}`

export function ResponsesSection({
  brunchId,
  menuId,
  isDraft,
  inviteOnly,
  canManage,
}: {
  brunchId: string
  menuId: string
  isDraft: boolean
} & ManageProps) {
  if (isDraft) {
    return (
      <p className="text-sm text-muted-foreground">
        Responses and the shopping list appear here once you send invites.
      </p>
    )
  }
  return (
    <ResponsesTabs
      brunchId={brunchId}
      menuId={menuId}
      inviteOnly={inviteOnly}
      canManage={canManage}
    />
  )
}

function ResponsesTabs({
  brunchId,
  menuId,
  inviteOnly,
  canManage,
}: {
  brunchId: string
  menuId: string
} & ManageProps) {
  const { data: responses } = useSuspenseQuery(
    brunchQueries.responses(brunchId),
  )
  const { data: menu } = useSuspenseQuery(menuQueries.detail(menuId))
  const counts = countGuests(responses)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Responses</CardTitle>
        <CardDescription>
          {counts.responded} responded · {counts.attending} attending ·{' '}
          {counts.declined} declined
          {counts.pending > 0 && ` · ${counts.pending} waiting`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {inviteOnly && canManage && <AddGuestForm brunchId={brunchId} />}
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {inviteOnly
              ? 'No guests yet. Add guests to get their personal links.'
              : 'No responses yet. Share the invite link to get started.'}
          </p>
        ) : !menu ? (
          <p className="text-sm text-muted-foreground">
            This brunch’s menu is no longer available.
          </p>
        ) : (
          <Tabs defaultValue="guests">
            <TabsList>
              <TabsTrigger value="guests">Guests</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="shopping">Shopping list</TabsTrigger>
            </TabsList>
            <TabsContent value="guests">
              <GuestList
                brunchId={brunchId}
                menu={menu}
                responses={responses}
                manageGuests={inviteOnly && canManage}
              />
            </TabsContent>
            <TabsContent value="summary">
              <ItemSummary menu={menu} responses={responses} />
            </TabsContent>
            <TabsContent value="shopping">
              <ShoppingList menu={menu} responses={responses} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

const badgeVariants: Record<GuestStatus, 'default' | 'secondary' | 'outline'> =
  { attending: 'default', declined: 'secondary', waiting: 'outline' }

function GuestStatus({ response }: { response: BrunchResponse }) {
  const status = guestStatus(response)
  return (
    <Badge variant={badgeVariants[status]}>{guestStatusLabels[status]}</Badge>
  )
}

function GuestList({
  brunchId,
  menu,
  responses,
  manageGuests,
}: {
  brunchId: string
  menu: MenuDetail
  responses: BrunchResponse[]
  manageGuests: boolean
}) {
  const removeGuest = useRemoveGuest(brunchId)
  const [removing, setRemoving] = useState<BrunchResponse | null>(null)
  return (
    <ul className="grid gap-2">
      {responses.map((response) => {
        const picks = describePicks(menu, response)
        return (
          <li key={response.id} className="rounded-lg border">
            <Collapsible>
              <div className="flex items-center gap-1 pr-2">
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3 text-left">
                  <span className="grid min-w-0 gap-1">
                    <span className="font-medium break-words">
                      {response.guest_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {response.responded_at
                        ? formatShortDayTime(response.responded_at)
                        : 'Not submitted'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <GuestStatus response={response} />
                    <ChevronDownIcon className="size-4 text-muted-foreground" />
                  </span>
                </CollapsibleTrigger>
                {manageGuests && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(guestLink(brunchId, response.id))
                          .then(
                            () => {
                              toast.success(
                                `Link for ${response.guest_name} copied`,
                              )
                            },
                            () => {
                              toast.error('Couldn’t copy the link')
                            },
                          )
                      }}
                    >
                      <CopyIcon />
                      <span className="sr-only">
                        Copy link for {response.guest_name}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setRemoving(response)
                      }}
                    >
                      <Trash2Icon />
                      <span className="sr-only">
                        Remove {response.guest_name}
                      </span>
                    </Button>
                  </>
                )}
              </div>
              <CollapsibleContent className="grid gap-3 border-t p-3 text-sm">
                {picks.length === 0 ? (
                  <p className="text-muted-foreground">No picks.</p>
                ) : (
                  <ul className="grid gap-2">
                    {picks.map((pick) => {
                      const extras = [
                        ...pick.choices,
                        ...pick.addons.map((a) => `+ ${a}`),
                      ]
                      return (
                        <li key={pick.id}>
                          <p className="font-medium">
                            {pick.quantity} × {pick.name}
                          </p>
                          {extras.length > 0 && (
                            <p className="text-muted-foreground">
                              {extras.join(' · ')}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {response.notes && (
                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-2">
                    {response.notes}
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </li>
        )
      })}
      <ConfirmDeleteDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={`Remove ${removing?.guest_name ?? 'guest'}?`}
        description="Their personal link stops working and their response is deleted. It can’t be undone."
        pending={removeGuest.isPending}
        onConfirm={() => {
          if (!removing) return
          removeGuest.mutate(removing.id, {
            onSuccess: () => {
              toast.success('Guest removed')
            },
            onError: (error) => {
              toast.error(error.message)
            },
            onSettled: () => {
              setRemoving(null)
            },
          })
        }}
      />
    </ul>
  )
}

function ItemSummary({
  menu,
  responses,
}: {
  menu: MenuDetail
  responses: BrunchResponse[]
}) {
  const items = summarizeItems(menu, responses)
  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Totals from attending guests, in servings.
      </p>
      {items.map((item) => (
        <div key={item.id} className="grid gap-1 text-sm">
          <p className="flex justify-between gap-3 font-medium">
            <span className="break-words">{item.name}</span>
            <span>{item.count}</span>
          </p>
          {item.groups.map((group) => (
            <div key={group.id} className="grid gap-0.5 pl-3">
              <p className="text-xs text-muted-foreground">{group.name}</p>
              {group.choices.map((choice) => (
                <CountRow
                  key={choice.id}
                  label={choice.name}
                  count={choice.count}
                />
              ))}
            </div>
          ))}
          {item.addons.length > 0 && (
            <div className="grid gap-0.5 pl-3">
              <p className="text-xs text-muted-foreground">Add-ons</p>
              {item.addons.map((addon) => (
                <CountRow
                  key={addon.id}
                  label={addon.name}
                  count={addon.count}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CountRow({ label, count }: { label: string; count: number }) {
  return (
    <p className="flex justify-between gap-3 text-muted-foreground">
      <span className="break-words">{label}</span>
      <span>{count}</span>
    </p>
  )
}

function ShoppingList({
  menu,
  responses,
}: {
  menu: MenuDetail
  responses: BrunchResponse[]
}) {
  const list = buildShoppingList(menu, responses)
  if (isShoppingListEmpty(list)) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to buy yet. The list fills in once guests are attending.
      </p>
    )
  }
  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        className="w-fit"
        onClick={() => {
          navigator.clipboard.writeText(shoppingListToText(list)).then(
            () => {
              toast.success('Shopping list copied')
            },
            () => {
              toast.error('Couldn’t copy the list')
            },
          )
        }}
      >
        <CopyIcon />
        Copy list
      </Button>
      <ul className="grid gap-1 text-sm">
        {list.ingredients.map((line) => (
          <li
            key={`${line.name.toLowerCase()}|${line.unit ?? ''}`}
            className="flex justify-between gap-3 border-b py-1.5 last:border-b-0"
          >
            <span className="break-words">{line.name}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatAmount(line)}
            </span>
          </li>
        ))}
      </ul>
      {list.itemsWithoutIngredients.length > 0 && (
        <div className="grid gap-1 text-sm">
          <p className="text-xs font-medium text-muted-foreground">
            {ITEMS_WITHOUT_INGREDIENTS_LABEL}
          </p>
          <ul className="grid gap-1">
            {list.itemsWithoutIngredients.map((item) => (
              <li key={item.name} className="border-b py-1.5 last:border-b-0">
                <p className="flex justify-between gap-3">
                  <span className="break-words">{item.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    x{item.quantity}
                  </span>
                </p>
                {[
                  ...item.choices.map((c) => ({ ...c, label: c.name })),
                  ...item.addons.map((a) => ({ ...a, label: `+ ${a.name}` })),
                ].map((pick) => (
                  <p
                    key={pick.label}
                    className="flex justify-between gap-3 pl-4 text-muted-foreground"
                  >
                    <span className="break-words">{pick.label}</span>
                    <span className="shrink-0">x{pick.quantity}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
