import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
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
import {
  menuQueries,
  useCreateMenu,
  useDeleteMenu,
  useUpdateMenu,
} from '#/lib/queries/menus'
import { useUserId } from '#/lib/queries/auth'
import type { Tables } from '#/lib/supabase/database.types'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { NameDescriptionDialog } from './name-description-dialog'

type MenuRow = Tables<'menus'>

export function MenuList() {
  const userId = useUserId()
  const { data: menus } = useSuspenseQuery(menuQueries.list(userId))
  const navigate = useNavigate()
  const createMenu = useCreateMenu()
  const deleteMenu = useDeleteMenu()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<MenuRow | null>(null)
  const [deleting, setDeleting] = useState<MenuRow | null>(null)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Menus</h1>
        <Button
          onClick={() => {
            setCreating(true)
          }}
        >
          <PlusIcon />
          New menu
        </Button>
      </div>

      {menus.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <p className="font-medium">No menus yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            A menu is a reusable list of dishes. Create one, then use it for any
            brunch.
          </p>
          <Button
            onClick={() => {
              setCreating(true)
            }}
          >
            <PlusIcon />
            Create your first menu
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map(({ items, ...menu }) => (
            <li key={menu.id}>
              <MenuCard
                menu={menu}
                itemCount={items[0]?.count ?? 0}
                onRename={() => {
                  setRenaming(menu)
                }}
                onDelete={() => {
                  setDeleting(menu)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <NameDescriptionDialog
        open={creating}
        onOpenChange={setCreating}
        title="New menu"
        description="Give your menu a name. You’ll add dishes next."
        submitLabel="Create menu"
        onSubmit={async (value) => {
          const menu = await createMenu.mutateAsync(value)
          toast.success('Menu created')
          await navigate({
            to: '/menus/$menuId',
            params: { menuId: menu.id },
          })
        }}
      />
      {renaming && (
        <RenameMenuDialog
          menu={renaming}
          onClose={() => {
            setRenaming(null)
          }}
        />
      )}
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description="This also deletes every dish on the menu. It can’t be undone."
        pending={deleteMenu.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteMenu.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Menu deleted')
            },
            onError: (error) => {
              toast.error(error.message)
            },
            onSettled: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </div>
  )
}

function RenameMenuDialog({
  menu,
  onClose,
}: {
  menu: MenuRow
  onClose: () => void
}) {
  const updateMenu = useUpdateMenu(menu.id)
  return (
    <NameDescriptionDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Edit menu"
      description="Change the name or description."
      submitLabel="Save"
      initialValues={{ name: menu.name, description: menu.description ?? '' }}
      onSubmit={async (value) => {
        await updateMenu.mutateAsync(value)
        toast.success('Menu updated')
      }}
    />
  )
}

function MenuCard({
  menu,
  itemCount,
  onRename,
  onDelete,
}: {
  menu: MenuRow
  itemCount: number
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <Card className="relative h-full transition-colors hover:bg-muted/40">
      <CardHeader>
        <CardTitle className="truncate pr-10">
          <Link
            to="/menus/$menuId"
            params={{ menuId: menu.id }}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {menu.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {menu.description ?? 'No description'}
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}
        </p>
        <CardAction className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreVerticalIcon />
              <span className="sr-only">Menu actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
