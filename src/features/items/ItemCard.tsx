import type { Item } from '../../data/items';
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

export function ItemCard({ item, onToggle, onOpen }: { item: Item; onToggle: () => void; onOpen: () => void }) {
  const done = isDone(item);
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card py-2.5 pr-2.5 pl-3 transition-opacity ${
        done ? 'opacity-55' : ''
      }`}
    >
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ItemThumb item={item} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`truncate text-[15px] font-bold ${done ? 'line-through' : ''}`}>{item.title}</span>
          <span className="truncate text-[12px] font-medium text-muted">{itemMeta(item)}</span>
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
}
