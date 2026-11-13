import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Item, ItemPriority } from '../../data/items';
import { Icon } from '../../ui/Icon';
import { SectionTitle } from '../../ui/kit';
import { ItemCard } from './ItemCard';
import { PRIORITIES, computeDrop, groupDropId, isDone, type ItemGroup } from './select';

interface Props {
  groups: ItemGroup[];
  onToggle: (i: Item) => void;
  onOpen: (i: Item) => void;
  onDelete: (i: Item) => void;
  onToggleUrgent: (i: Item) => void;
  /** Persiste prioridad + orden de un pendiente soltado. */
  onMove: (i: Item, priority: ItemPriority, sortOrder: number) => void;
  /** Nombre de lista por pendiente (vista "Todas"); undefined = no mostrar. */
  listNameOf?: (i: Item) => string | undefined;
}

/**
 * Las 3 prioridades en un solo tablero: arrastra el asa ⋮⋮ para reordenar
 * o suelta en otra sección para cambiar la prioridad. Mientras arrastras,
 * aparecen también las secciones vacías para poder soltar ahí.
 */
export function PriorityBoard({ groups, onToggle, onOpen, onDelete, onToggleUrgent, onMove, listNameOf }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroup, setOverGroup] = useState<ItemPriority | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const full = PRIORITIES.map(
    (p) =>
      groups.find((g) => g.priority === p.value) ?? {
        priority: p.value,
        label: p.label,
        dot: p.dot,
        items: [],
        pending: 0,
      },
  );
  const pendingBy = Object.fromEntries(full.map((g) => [g.priority, g.items.filter((i) => !isDone(i))])) as Record<
    ItemPriority,
    Item[]
  >;
  const all = full.flatMap((g) => g.items);
  const active = activeId ? all.find((i) => i.id === activeId) : undefined;

  const groupOf = (id: string): ItemPriority | null => {
    if (id.startsWith('group:')) return id.slice(6) as ItemPriority;
    return all.find((i) => i.id === id)?.priority ?? null;
  };

  const onStart = ({ active: a }: DragStartEvent) => setActiveId(String(a.id));
  const onOver = ({ over }: DragOverEvent) => setOverGroup(over ? groupOf(String(over.id)) : null);
  const onEnd = ({ active: a, over }: DragEndEvent) => {
    setActiveId(null);
    setOverGroup(null);
    if (!over) return;
    const res = computeDrop(pendingBy, String(a.id), String(over.id));
    const item = all.find((i) => i.id === a.id);
    if (res && item) onMove(item, res.priority, res.sort_order);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onStart}
      onDragOver={onOver}
      onDragEnd={onEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverGroup(null);
      }}
    >
      {full
        .filter((g) => g.items.length > 0 || activeId)
        .map((g) => (
          <Section
            key={g.priority}
            group={g}
            highlight={activeId != null && overGroup === g.priority && active?.priority !== g.priority}
            pending={pendingBy[g.priority]}
            dragging={activeId}
            onToggle={onToggle}
            onOpen={onOpen}
            onDelete={onDelete}
            onToggleUrgent={onToggleUrgent}
            listNameOf={listNameOf}
          />
        ))}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="scale-[1.03] rounded-[var(--radius-card)] shadow-2xl">
            <ItemCard
              item={active}
              onToggle={() => {}}
              onOpen={() => {}}
              handle={<GripIcon />}
              listName={listNameOf?.(active)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Section({
  group,
  highlight,
  pending,
  dragging,
  onToggle,
  onOpen,
  onDelete,
  onToggleUrgent,
  listNameOf,
}: {
  group: ItemGroup;
  highlight: boolean;
  pending: Item[];
  dragging: string | null;
  onToggle: (i: Item) => void;
  onOpen: (i: Item) => void;
  onDelete: (i: Item) => void;
  onToggleUrgent: (i: Item) => void;
  listNameOf?: (i: Item) => string | undefined;
}) {
  const { setNodeRef } = useDroppable({ id: groupDropId(group.priority) });
  const done = group.items.filter(isDone);
  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-[22px] transition-colors ${
        highlight ? 'bg-track p-2 outline-2 outline-dashed outline-primary' : ''
      }`}
    >
      <SectionTitle dot={group.dot}>
        {group.label} <span className="text-[13px] font-bold text-muted">{group.pending}</span>
      </SectionTitle>
      <SortableContext items={pending.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {pending.map((it) => (
          <SortableCard
            key={it.id}
            item={it}
            hidden={dragging === it.id}
            onToggle={() => onToggle(it)}
            onOpen={() => onOpen(it)}
            onDelete={() => onDelete(it)}
            onToggleUrgent={() => onToggleUrgent(it)}
            listName={listNameOf?.(it)}
          />
        ))}
      </SortableContext>
      {pending.length === 0 && dragging && (
        <div className="flex h-16 items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-dashed text-[13px] font-bold text-muted">
          Suelta aquí para {group.label.toLowerCase()}
        </div>
      )}
      {done.map((it) => (
        <ItemCard
          key={it.id}
          item={it}
          onToggle={() => onToggle(it)}
          onOpen={() => onOpen(it)}
          onDelete={() => onDelete(it)}
          listName={listNameOf?.(it)}
        />
      ))}
    </section>
  );
}

function GripIcon() {
  return (
    <span className="-ml-1 flex h-11 w-7 shrink-0 items-center justify-center text-muted">
      <Icon name="grip" size={20} stroke={3} />
    </span>
  );
}

function SortableCard({
  item,
  hidden,
  onToggle,
  onOpen,
  onDelete,
  onToggleUrgent,
  listName,
}: {
  item: Item;
  hidden: boolean;
  listName?: string;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onToggleUrgent: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, opacity: hidden ? 0.35 : 1 }}
    >
      <ItemCard
        item={item}
        onToggle={onToggle}
        onOpen={onOpen}
        onDelete={hidden ? undefined : onDelete}
        onToggleUrgent={hidden ? undefined : onToggleUrgent}
        listName={listName}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Mover "${item.title}" (reordenar o cambiar de prioridad)`}
            aria-roledescription="asa para mover"
            className="-ml-1 flex h-11 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
          >
            <Icon name="grip" size={20} stroke={3} />
          </button>
        }
      />
    </div>
  );
}
