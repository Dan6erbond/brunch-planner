import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  CopyIcon,
  LogOutIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
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
import { useUserId } from '#/lib/queries/auth'
import {
  useMenuRole,
  useRemoveMenuCollaborator,
} from '#/lib/queries/menu-collaborators'
import {
  menuQueries,
  type MenuItemDetail,
  useCopyMenu,
  useDeleteItem,
  useDeleteMenu,
  useReorderItems,
  useUpdateMenu,
} from '#/lib/queries/menus'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { MenuItemEditSheet } from './menu-item-edit-sheet'
import { MenuItemList } from './menu-item-list'
import { NameDescriptionDialog } from './name-description-dialog'
import { ShareMenuDialog } from './share-menu-dialog'

type ItemRow = MenuItemDetail

export function MenuEditor({ menuId }: { menuId: string }) {
  const { data: menu } = useSuspenseQuery(menuQueries.detail(menuId))
  const navigate = useNavigate()
  const updateMenu = useUpdateMenu(menuId)
  const deleteMenu = useDeleteMenu()
  const copyMenu = useCopyMenu()
  const deleteItem = useDeleteItem(menuId)
  const reorder = useReorderItems()
  const userId = useUserId()
  const role = useMenuRole(menuId)
  const leaveMenu = useRemoveMenuCollaborator(menuId)
  const isOwner = role === 'owner'
  const canEdit = isOwner || role === 'editor'
  const [sharing, setSharing] = useState(false)
  const [editingMenu, setEditingMenu] = useState(false)
  const [deletingMenu, setDeletingMenu] = useState(false)
  const [itemSheetOpen, setItemSheetOpen] = useState(false)
  const [sheetItem, setSheetItem] = useState<ItemRow | null>(null)
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

  const openItemSheet = (item: ItemRow | null) => {
    setSheetItem(item)
    setItemSheetOpen(true)
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
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" />}
            >
              <MoreVerticalIcon />
              <span className="sr-only">Menu actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingMenu(true)
                  }}
                >
                  <PencilIcon />
                  Edit menu
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  copyMenu.mutate(menuId, {
                    onSuccess: (newMenuId) => {
                      toast.success('Menu copied to your menus')
                      void navigate({
                        to: '/menus/$menuId',
                        params: { menuId: newMenuId },
                      })
                    },
                    onError: (error) => {
                      toast.error(error.message)
                    },
                  })
                }}
              >
                <CopyIcon />
                {isOwner ? 'Duplicate' : 'Copy to my menus'}
              </DropdownMenuItem>
              {isOwner && (
                <DropdownMenuItem
                  onClick={() => {
                    setSharing(true)
                  }}
                >
                  <Share2Icon />
                  Share
                </DropdownMenuItem>
              )}
              {!isOwner && (
                <DropdownMenuItem
                  onClick={() => {
                    leaveMenu.mutate(userId, {
                      onSuccess: () => {
                        toast.success('You left the menu')
                        void navigate({ to: '/menus' })
                      },
                      onError: (error) => {
                        toast.error(error.message)
                      },
                    })
                  }}
                >
                  <LogOutIcon />
                  Leave
                </DropdownMenuItem>
              )}
              {isOwner && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeletingMenu(true)
                  }}
                >
                  <Trash2Icon />
                  Delete menu
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Dishes</h2>
        {canEdit && (
          <Button
            onClick={() => {
              openItemSheet(null)
            }}
          >
            <PlusIcon />
            Add dish
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <p className="font-medium">No dishes yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add the dishes guests can choose from, like “Avocado Toast”.
          </p>
        </div>
      ) : (
        <MenuItemList
          items={items}
          readOnly={!canEdit}
          onReorder={(itemIds) => {
            reorder.mutate(
              { menuId, itemIds },
              {
                onError: (error) => {
                  toast.error(error.message)
                },
              },
            )
          }}
          onEdit={openItemSheet}
          onDelete={setDeletingItem}
        />
      )}

      {isOwner && (
        <ShareMenuDialog
          menuId={menuId}
          open={sharing}
          onOpenChange={setSharing}
        />
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

      <MenuItemEditSheet
        menuId={menuId}
        item={sheetItem}
        open={itemSheetOpen}
        onOpenChange={setItemSheetOpen}
      />
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
