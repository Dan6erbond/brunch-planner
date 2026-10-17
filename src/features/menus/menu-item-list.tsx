import { MoreVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { SortableList, SortableRow } from '#/components/sortable'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { unitSymbol } from './ingredient-units'
import type { MenuItemDetail } from '#/lib/queries/menus'

type ItemRow = MenuItemDetail

type MenuItemListProps = {
  items: ItemRow[]
  readOnly: boolean
  onReorder: (itemIds: string[]) => void
  onEdit: (item: ItemRow) => void
  onDelete: (item: ItemRow) => void
}

export function MenuItemList({
  items,
  readOnly,
  onReorder,
  onEdit,
  onDelete,
}: MenuItemListProps) {
  if (readOnly) {
    return (
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <ReadOnlyItemRow item={item} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <SortableList
      ids={items.map((item) => item.id)}
      onReorder={onReorder}
      className="grid gap-2"
    >
      {items.map((item) => (
        <SortableItemRow
          key={item.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </SortableList>
  )
}

const plural = (count: number, noun: string) =>
  `${String(count)} ${noun}${count === 1 ? '' : 's'}`

function OptionSummary({ item }: { item: ItemRow }) {
  const parts = [
    item.option_groups.length > 0 &&
      plural(item.option_groups.length, 'option group'),
    item.addons.length > 0 && plural(item.addons.length, 'add-on'),
  ].filter(Boolean)
  if (parts.length === 0) return null
  return <p className="text-xs text-muted-foreground">{parts.join(', ')}</p>
}

function SortableItemRow({
  item,
  onEdit,
  onDelete,
}: Pick<MenuItemListProps, 'onEdit' | 'onDelete'> & { item: ItemRow }) {
  return (
    <SortableRow
      id={item.id}
      handleLabel={`Reorder ${item.name}`}
      className="flex items-center gap-1 rounded-3xl border bg-card p-2 pl-1"
    >
      {(handle) => (
        <>
          {handle}
          <div className="min-w-0 flex-1 px-1">
            <p className="font-medium break-words">{item.name}</p>
            {item.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            )}
            <OptionSummary item={item} />
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" />}
            >
              <MoreVerticalIcon />
              <span className="sr-only">Actions for {item.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  onEdit(item)
                }}
              >
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  onDelete(item)
                }}
              >
                <Trash2Icon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </SortableRow>
  )
}

const formatIngredient = (ingredient: ItemRow['ingredients'][number]) =>
  [
    ingredient.quantity,
    ingredient.unit && unitSymbol(ingredient.unit),
    ingredient.name,
  ]
    .filter(Boolean)
    .join(' ')

function ReadOnlyItemRow({ item }: { item: ItemRow }) {
  return (
    <div className="grid gap-2 rounded-3xl border bg-card p-4">
      <div>
        <p className="font-medium break-words">{item.name}</p>
        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}
      </div>
      {item.option_groups.map((group) => (
        <p key={group.id} className="text-sm">
          <span className="font-medium">{group.name}</span>
          {group.required ? '' : ' (optional)'}:{' '}
          {group.option_choices.map((choice) => choice.name).join(', ')}
        </p>
      ))}
      {item.addons.length > 0 && (
        <p className="text-sm">
          <span className="font-medium">Add-ons:</span>{' '}
          {item.addons.map((addon) => addon.name).join(', ')}
        </p>
      )}
      {item.ingredients.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Ingredients: {item.ingredients.map(formatIngredient).join(', ')}
        </p>
      )}
    </div>
  )
}
