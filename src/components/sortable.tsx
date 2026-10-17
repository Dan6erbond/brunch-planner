import { createContext, use, type ReactNode } from 'react'
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

type Layout = 'list' | 'grid'

const LayoutContext = createContext<Layout>('list')

type SortableListProps = {
  ids: string[]
  onReorder: (ids: string[]) => void
  layout?: Layout
  className?: string
  children: ReactNode
}

export function SortableList({
  ids,
  onReorder,
  layout = 'list',
  className,
  children,
}: SortableListProps) {
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
    onReorder(
      arrayMove(
        ids,
        ids.indexOf(String(active.id)),
        ids.indexOf(String(over.id)),
      ),
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy
        }
      >
        <LayoutContext value={layout}>
          <ul className={className}>{children}</ul>
        </LayoutContext>
      </SortableContext>
    </DndContext>
  )
}

type SortableRowProps = {
  id: string
  handleLabel: string
  className?: string
  children: (handle: ReactNode) => ReactNode
}

export function SortableRow({
  id,
  handleLabel,
  className,
  children,
}: SortableRowProps) {
  const layout = use(LayoutContext)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const handle = (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="icon"
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon />
      <span className="sr-only">{handleLabel}</span>
    </Button>
  )

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(
          layout === 'list' && transform
            ? { ...transform, x: 0, scaleX: 1, scaleY: 1 }
            : transform,
        ),
        transition,
      }}
      className={cn(
        'relative',
        isDragging && 'z-10 shadow-lg ring-2 ring-ring/40',
        className,
      )}
    >
      {children(handle)}
    </li>
  )
}
