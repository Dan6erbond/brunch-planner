import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVerticalIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'
import type { Tables } from '#/lib/supabase/database.types'

type ItemRow = Tables<'items'>

type MenuItemListProps = {
  items: ItemRow[]
  onReorder: (itemIds: string[]) => void
  onEdit: (item: ItemRow) => void
  onDelete: (item: ItemRow) => void
}

export function MenuItemList({
  items,
  onReorder,
  onEdit,
  onDelete,
}: MenuItemListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = items.map((item) => item.id)
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul className="grid gap-2">
          {items.map((item) => (
            <SortableItemRow
              key={item.id}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableItemRow({
  item,
  onEdit,
  onDelete,
}: Pick<MenuItemListProps, 'onEdit' | 'onDelete'> & { item: ItemRow }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(
          transform && { ...transform, x: 0, scaleX: 1, scaleY: 1 },
        ),
        transition,
      }}
      className={cn(
        'relative flex items-center gap-1 rounded-3xl border bg-card p-2 pl-1',
        isDragging && 'z-10 shadow-lg ring-2 ring-ring/40',
      )}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon />
        <span className="sr-only">Reorder {item.name}</span>
      </Button>
      <div className="min-w-0 flex-1 px-1">
        <p className="font-medium break-words">{item.name}</p>
        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
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
    </li>
  )
}
