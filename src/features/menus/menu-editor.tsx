import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  menuQueries,
  useCreateItem,
  useDeleteItem,
  useDeleteMenu,
  useReorderItems,
  useUpdateItem,
  useUpdateMenu,
} from '#/lib/queries/menus'
import type { Tables } from '#/lib/supabase/database.types'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { NameDescriptionDialog } from './name-description-dialog'

type ItemRow = Tables<'items'>

export function MenuEditor({ menuId }: { menuId: string }) {
  const { data: menu } = useSuspenseQuery(menuQueries.detail(menuId))
  const navigate = useNavigate()
  const updateMenu = useUpdateMenu(menuId)
  const deleteMenu = useDeleteMenu()
  const createItem = useCreateItem(menuId)
  const deleteItem = useDeleteItem(menuId)
  const reorder = useReorderItems()
  const [editingMenu, setEditingMenu] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [deletingItem, setDeletingItem] = useState<ItemRow | null>(null)

  if (!menu) {
    return (
      <div className="grid justify-items-start gap-3">
        <h1 className="text-2xl font-semibold">Menu not found</h1>
        <Button variant="outline" render={<Link to="/menus" />}>
          <ArrowLeftIcon />
          Back to menus
        </Button>
      </div>
    )
  }

  const { items } = menu

  const move = (index: number, offset: -1 | 1) => {
    const ids = items.map((item) => item.id)
    const target = index + offset
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(
      { menuId, itemIds: ids },
      {
        onError: (error) => {
          toast.error(error.message)
        },
      },
    )
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          render={<Link to="/menus" />}
        >
          <ArrowLeftIcon />
          Menus
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold break-words">{menu.name}</h1>
            {menu.description && (
              <p className="mt-1 text-muted-foreground">{menu.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" />}
            >
              <MoreVerticalIcon />
              <span className="sr-only">Menu actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingMenu(true)
                }}
              >
                <PencilIcon />
                Edit menu
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setDeletingMenu(true)
                }}
              >
                <Trash2Icon />
                Delete menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Dishes</h2>
        <Button
          onClick={() => {
            setAddingItem(true)
          }}
        >
          <PlusIcon />
          Add dish
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <p className="font-medium">No dishes yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add the dishes guests can choose from, like “Avocado Toast”.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-3xl border bg-card p-3 pl-5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{item.name}</p>
                {item.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={index === 0 || reorder.isPending}
                onClick={() => {
                  move(index, -1)
                }}
              >
                <ArrowUpIcon />
                <span className="sr-only">Move up</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={index === items.length - 1 || reorder.isPending}
                onClick={() => {
                  move(index, 1)
                }}
              >
                <ArrowDownIcon />
                <span className="sr-only">Move down</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreVerticalIcon />
                  <span className="sr-only">Dish actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingItem(item)
                    }}
                  >
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeletingItem(item)
                    }}
                  >
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <NameDescriptionDialog
        open={editingMenu}
        onOpenChange={setEditingMenu}
        title="Edit menu"
        description="Change the name or description."
        submitLabel="Save"
        initialValues={{ name: menu.name, description: menu.description ?? '' }}
        onSubmit={async (value) => {
          await updateMenu.mutateAsync(value)
          toast.success('Menu updated')
        }}
      />
      <ConfirmDeleteDialog
        open={deletingMenu}
        onOpenChange={setDeletingMenu}
        title={`Delete “${menu.name}”?`}
        description="This also deletes every dish on the menu. It can’t be undone."
        pending={deleteMenu.isPending}
        onConfirm={() => {
          deleteMenu.mutate(menuId, {
            onSuccess: () => {
              toast.success('Menu deleted')
              void navigate({ to: '/menus' })
            },
            onError: (error) => {
              toast.error(error.message)
              setDeletingMenu(false)
            },
          })
        }}
      />

      <NameDescriptionDialog
        open={addingItem}
        onOpenChange={setAddingItem}
        title="Add dish"
        description="Name the dish and add a short description if you like."
        submitLabel="Add dish"
        onSubmit={async (value) => {
          await createItem.mutateAsync(value)
          toast.success('Dish added')
        }}
      />
      {editingItem && (
        <EditItemDialog
          menuId={menuId}
          item={editingItem}
          onClose={() => {
            setEditingItem(null)
          }}
        />
      )}
      <ConfirmDeleteDialog
        open={deletingItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null)
        }}
        title={`Delete “${deletingItem?.name ?? ''}”?`}
        description="This removes the dish from the menu. It can’t be undone."
        pending={deleteItem.isPending}
        onConfirm={() => {
          if (!deletingItem) return
          deleteItem.mutate(deletingItem.id, {
            onSuccess: () => {
              toast.success('Dish deleted')
            },
            onError: (error) => {
              toast.error(error.message)
            },
            onSettled: () => {
              setDeletingItem(null)
            },
          })
        }}
      />
    </div>
  )
}

function EditItemDialog({
  menuId,
  item,
  onClose,
}: {
  menuId: string
  item: ItemRow
  onClose: () => void
}) {
  const updateItem = useUpdateItem(menuId, item.id)
  return (
    <NameDescriptionDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Edit dish"
      description="Change the name or description."
      submitLabel="Save"
      initialValues={{ name: item.name, description: item.description ?? '' }}
      onSubmit={async (value) => {
        await updateItem.mutateAsync(value)
        toast.success('Dish updated')
      }}
    />
  )
}
