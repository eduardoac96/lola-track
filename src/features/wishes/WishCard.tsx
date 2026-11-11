import type { Wish, WishClaim } from '../../data/wishes';
import { Icon } from '../../ui/Icon';
import { SwipeRow } from '../../ui/SwipeRow';
import { CLAIM_LABEL, wishMeta } from './select';

const STAR = '#F5A524';

export function WishTile({ wish, size = 52 }: { wish: Wish; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[14px]"
      style={{
        width: size,
        height: size,
        background: wish.starred ? '#FFF4DE' : 'var(--color-compra-tint)',
        color: wish.starred ? '#8A5300' : 'var(--color-compra-fg)',
      }}
    >
      <Icon name="gift" size={Math.round(size * 0.46)} />
    </span>
  );
}

/**
 * Tarjeta de deseo.
 * - Propio: estrella (favorito), deslizar a la izquierda elimina y a la derecha "Ya lo tengo".
 * - Ajeno: botón de apartado (Apartar → Apartado → Comprado); el dueño nunca lo ve.
 */
export function WishCard({
  wish,
  mine,
  claim,
  onOpen,
  onStar,
  onToggleGot,
  onDelete,
  onClaimTap,
}: {
  wish: Wish;
  mine: boolean;
  claim?: WishClaim | undefined;
  onOpen: () => void;
  onStar?: () => void;
  onToggleGot?: () => void;
  onDelete?: () => void;
  onClaimTap?: () => void;
}) {
  const got = wish.got_at != null;
  const meta = wishMeta(wish);
  const card = (
    <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-card py-2.5 pr-2.5 pl-3">
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-w-0 flex-1 items-center gap-3 text-left ${got ? 'opacity-55' : ''}`}
      >
        <WishTile wish={wish} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`flex items-center gap-1.5 text-[15px] font-bold ${got ? 'line-through' : ''}`}>
            {!mine && wish.starred && (
              <span className="shrink-0" style={{ color: STAR }} aria-label="Favorito">
                <Icon name="star" size={14} filled />
              </span>
            )}
            <span className="truncate">{wish.title}</span>
          </span>
          {(meta || got) && (
            <span className="truncate text-[12px] font-medium text-muted">
              {[got ? (mine ? 'Ya lo tienes' : 'Ya lo tiene') : null, meta || null].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </button>

      {mine && onStar && !got && (
        <button
          type="button"
          onClick={onStar}
          aria-label={wish.starred ? `Quitar "${wish.title}" de favoritos` : `Marcar "${wish.title}" como favorito`}
          aria-pressed={wish.starred}
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ color: wish.starred ? STAR : 'var(--color-check)' }}
        >
          <Icon name="star" size={24} filled={wish.starred} />
        </button>
      )}

      {!mine && !got && onClaimTap && <ClaimPill claim={claim} title={wish.title} onTap={onClaimTap} />}
    </div>
  );

  if (!mine || !onDelete) return card;
  return (
    <SwipeRow
      onDelete={onDelete}
      right={
        onToggleGot
          ? {
              label: got ? 'Aún no lo tengo' : 'Ya lo tengo',
              icon: 'check',
              bg: got ? 'bg-[#6B6880]' : 'bg-done',
              run: onToggleGot,
              key: 't',
            }
          : undefined
      }
      label={wish.title}
      className="rounded-[var(--radius-card)]"
    >
      {card}
    </SwipeRow>
  );
}

function ClaimPill({ claim, title, onTap }: { claim?: WishClaim | undefined; title: string; onTap: () => void }) {
  const status = claim?.status;
  const style =
    status === 'comprado'
      ? 'border-done bg-done text-white'
      : status === 'apartado'
        ? 'border-[#F5A524] bg-[#FFF4DE] text-[#8A5300]'
        : 'border-line bg-card text-primary-hover';
  const label = status ? CLAIM_LABEL[status] : 'Apartar';
  const next = !status ? 'apartar' : status === 'apartado' ? 'marcar como comprado' : 'ver opciones de';
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`${label}: ${next} "${title}"`}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-[13px] font-extrabold ${style}`}
    >
      {status === 'comprado' && <Icon name="check" size={16} stroke={3} />}
      {label}
    </button>
  );
}
