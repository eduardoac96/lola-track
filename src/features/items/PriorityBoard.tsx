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
import { PRIORITIES, bucketOf, computeDrop, groupDropId, isDone, type ItemGroup } from './select';
import type { GiftStage } from './gifts';

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
  /** Estado de regalo si el pendiente es de una lista de regalos. */
  stageOf?: (i: Item) => GiftStage | undefined;
  onAdvanceStage?: (i: Item) => void;
  /** Hechos más antiguos que no vienen en `groups` (se ofrecen dentro de "Hechos"). */
  olderDone?: { count: number; onShow: () => void };
}

/**
 * Las 3 prioridades en un solo tablero: arrastra el asa ⋮⋮ para reordenar
 * o suelta en otra sección para cambiar la prioridad. Mientras arrastras,
 * aparecen también las secciones vacías para poder soltar ahí.
 */
export function PriorityBoard({
  groups,
  onToggle,
  onOpen,
  onDelete,
  onToggleUrgent,
  onMove,
  listNameOf,
  stageOf,
  onAdvanceStage,
  olderDone,
}: Props) {
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
  const doneAll = all.filter(isDone).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
  const [showDone, setShowDone] = useState(false);
  const active = activeId ? all.find((i) => i.id === activeId) : undefined;

  const groupOf = (id: string): ItemPriority | null => {
    if (id.startsWith('group:')) return id.slice(6) as ItemPriority;
    const p = all.find((i) => i.id === id)?.priority;
    return p ? bucketOf(p) : null;
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
        .filter((g) => pendingBy[g.priority].length > 0 || activeId)
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
            stageOf={stageOf}
          />
        ))}
      {(doneAll.length > 0 || (olderDone?.count ?? 0) > 0) && !activeId && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="flex h-11 items-center gap-2 self-start rounded-full px-1 text-[14px] font-bold text-muted"
          >
            <span className={`transition-transform ${showDone ? 'rotate-90' : ''}`}>
              <Icon name="chevronRight" size={16} stroke={2.5} />
            </span>
            Hechos ({doneAll.length + (olderDone?.count ?? 0)})
          </button>
          {showDone &&
            doneAll.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                onToggle={() => onToggle(it)}
                onOpen={() => onOpen(it)}
                onDelete={() => onDelete(it)}
                listName={listNameOf?.(it)}
                stage={stageOf?.(it)}
                onAdvanceStage={onAdvanceStage ? () => onAdvanceStage(it) : undefined}
              />
            ))}
          {showDone && olderDone && olderDone.count > 0 && (
            <button type="button" onClick={olderDone.onShow} className="h-11 text-[14px] font-bold text-primary-hover">
              Ver hechos antiguos ({olderDone.count})
            </button>
          )}
        </section>
      )}
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
  stageOf,
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
  stageOf?: (i: Item) => GiftStage | undefined;
}) {
  const { setNodeRef } = useDroppable({ id: groupDropId(group.priority) });
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
            stage={stageOf?.(it)}
          />
        ))}
      </SortableContext>
      {pending.length === 0 && dragging && (
        <div className="flex h-16 items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-dashed text-[13px] font-bold text-muted">
          Suelta aquí para {group.label.toLowerCase()}
        </div>
      )}
    </section>
  );
}

function GripIcon() {
  return (
    <span className="-ml-2 flex h-11 w-6 shrink-0 items-center justify-center text-check">
      <Icon name="grip" size={18} stroke={3} />
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
  stage,
}: {
  item: Item;
  hidden: boolean;
  listName?: string;
  stage?: GiftStage;
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
        stage={stage}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Mover "${item.title}" (reordenar o cambiar de prioridad)`}
            aria-roledescription="asa para mover"
            className="-ml-2 flex h-11 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-check active:cursor-grabbing"
          >
            <Icon name="grip" size={18} stroke={3} />
          </button>
        }
      />
    </div>
  );
}
