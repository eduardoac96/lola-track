import type { ReactNode } from 'react';
import type { Item } from '../../data/items';
import { SwipeRow } from '../../ui/SwipeRow';
import { usePhotoUrl } from '../../data/photos';
import { Icon } from '../../ui/Icon';
import { TYPES, isDone, itemMeta } from './select';

export function ItemThumb({ item, size = 52 }: { item: Item; size?: number }) {
  const t = TYPES[item.type];
  const photo = usePhotoUrl(item.photo_path);
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[14px]"
      style={{ width: size, height: size, background: t.tint, color: t.fg }}
    >
      {photo.data ? (
        <img src={photo.data} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Icon name={t.icon} />
      )}
    </span>
  );
}

export function ItemCard({
  item,
  onToggle,
  onOpen,
  onDelete,
  onToggleUrgent,
  handle,
  listName,
}: {
  item: Item;
  /** Nombre de la lista a mostrar en la línea de detalle (solo en la vista "Todas"). */
  listName?: string;
  onToggle: () => void;
  onOpen: () => void;
  /** Si viene, la tarjeta se puede deslizar a la izquierda para eliminar. */
  onDelete?: () => void;
  /** Si viene, deslizar a la derecha marca/desmarca urgente. */
  onToggleUrgent?: () => void;
  /** Asa de arrastre para reordenar (opcional). */
  handle?: ReactNode;
}) {
  const done = isDone(item);
  const card = (
    <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-card py-2.5 pr-2.5 pl-3">
      {handle}
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity ${done ? 'opacity-55' : ''}`}
      >
        <ItemThumb item={item} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`truncate text-[15px] font-bold ${done ? 'line-through' : ''}`}>{item.title}</span>
          <span className="truncate text-[12px] font-medium text-muted">{itemMeta(item, listName)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Marcar "${item.title}" como pendiente` : `Marcar "${item.title}" como hecho`}
        aria-pressed={done}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-white ${
          done ? 'border-done bg-done' : 'border-check bg-card'
        }`}
      >
        {done && (
          <span className="animate-[pop_.25s_ease-out]">
            <Icon name="check" size={20} stroke={3} />
          </span>
        )}
      </button>
    </div>
  );
  if (!onDelete) return card;
  return (
    <SwipeRow
      onDelete={onDelete}
      right={
        onToggleUrgent && !done
          ? {
              label: item.priority === 'urgente' ? 'Quitar urgente' : 'Urgente',
              icon: 'flag',
              bg: item.priority === 'urgente' ? 'bg-[#6B6880]' : 'bg-[#E5484D]',
              run: onToggleUrgent,
              key: 'u',
            }
          : undefined
      }
      label={item.title}
      className="rounded-[var(--radius-card)]"
    >
      {card}
    </SwipeRow>
  );
}
