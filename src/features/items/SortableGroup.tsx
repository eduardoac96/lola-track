import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item } from '../../data/items';
import { Icon } from '../../ui/Icon';
import { ItemCard } from './ItemCard';
import { isDone, sortOrderAt } from './select';

interface Props {
  items: Item[];
  onToggle: (i: Item) => void;
  onOpen: (i: Item) => void;
  onDelete: (i: Item) => void;
  /** Persiste el nuevo orden de un pendiente. */
  onReorder: (id: string, sortOrder: number) => void;
}

/**
 * Lista de una prioridad: los pendientes se reordenan arrastrando el asa (⋮⋮);
 * los hechos quedan al final y no se arrastran.
 */
export function SortableGroup({ items, onToggle, onOpen, onDelete, onReorder }: Props) {
  const pending = items.filter((i) => !isDone(i));
  const done = items.filter(isDone);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = pending.findIndex((i) => i.id === active.id);
    const to = pending.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    const moved = arrayMove(pending, from, to);
    const rest = moved.filter((i) => i.id !== active.id);
    onReorder(String(active.id), sortOrderAt(rest, to));
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={pending.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {pending.map((it) => (
            <SortableCard
              key={it.id}
              item={it}
              canDrag={pending.length > 1}
              onToggle={() => onToggle(it)}
              onOpen={() => onOpen(it)}
              onDelete={() => onDelete(it)}
            />
          ))}
        </SortableContext>
      </DndContext>
      {done.map((it) => (
        <ItemCard
          key={it.id}
          item={it}
          onToggle={() => onToggle(it)}
          onOpen={() => onOpen(it)}
          onDelete={() => onDelete(it)}
        />
      ))}
    </>
  );
}

function SortableCard({
  item,
  canDrag,
  onToggle,
  onOpen,
  onDelete,
}: {
  item: Item;
  canDrag: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        position: 'relative',
      }}
      className={isDragging ? 'scale-[1.02] shadow-xl' : ''}
    >
      <ItemCard
        item={item}
        onToggle={onToggle}
        onOpen={onOpen}
        onDelete={isDragging ? undefined : onDelete}
        handle={
          canDrag ? (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Reordenar "${item.title}"`}
              aria-roledescription="asa para reordenar"
              className="-ml-1 flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
            >
              <Icon name="grip" size={20} stroke={3} />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
