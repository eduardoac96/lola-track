import { useState } from 'react';
import { useApp } from '../../app/context';
import { useSetClaim, useUpdateWish, type ClaimStatus, type Wish, type WishClaim } from '../../data/wishes';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, Segmented, inputCls } from '../../ui/kit';
import { WishTile } from './WishCard';
import { linkHost } from './select';

export function WishSheet({
  wish,
  claim,
  onClose,
  onDelete,
}: {
  wish: Wish | null;
  claim?: WishClaim | undefined;
  onClose: () => void;
  onDelete: (w: Wish) => void;
}) {
  const { userId } = useApp();
  if (!wish) return null;
  return wish.owner_id === userId ? (
    <OwnWishForm key={wish.id} wish={wish} onClose={onClose} onDelete={onDelete} />
  ) : (
    <OtherWishView key={wish.id} wish={wish} claim={claim} onClose={onClose} />
  );
}

function OwnWishForm({ wish, onClose, onDelete }: { wish: Wish; onClose: () => void; onDelete: (w: Wish) => void }) {
  const { hid } = useApp();
  const update = useUpdateWish(hid);
  const [title, setTitle] = useState(wish.title);
  const [price, setPrice] = useState(centsToInput(wish.price_estimated_cents));
  const [link, setLink] = useState(wish.link_url ?? '');
  const [notes, setNotes] = useState(wish.notes ?? '');
  const [starred, setStarred] = useState(wish.starred);
  const [more, setMore] = useState(Boolean(wish.notes));

  const priceCents = parsePesos(price);
  const linkOk = !link || /^https?:\/\//i.test(link.trim());
  const valid = title.trim().length > 0 && (price === '' || priceCents != null) && linkOk;
  const got = wish.got_at != null;

  const save = () => {
    update.mutate({
      id: wish.id,
      patch: {
        title: title.trim(),
        price_estimated_cents: priceCents,
        link_url: link.trim() || null,
        notes: notes.trim() || null,
        starred,
      },
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Mi deseo"
      footer={
        <PrimaryButton disabled={!valid} onClick={save}>
          Guardar
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Qué te gustaría">
          <input className={inputCls} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio aprox.">
            <input
              className={inputCls}
              inputMode="decimal"
              value={price}
              placeholder="$0"
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={price !== '' && priceCents == null}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-muted">Favorito</span>
            <button
              type="button"
              aria-pressed={starred}
              onClick={() => setStarred(!starred)}
              className={`flex h-12 items-center justify-center gap-2 rounded-[14px] border text-[15px] font-bold ${
                starred ? 'border-[#F5A524] bg-[#FFF4DE] text-[#8A5300]' : 'border-field-line bg-field text-muted'
              }`}
            >
              <Icon name="star" size={20} filled={starred} />
              {starred ? 'Lo que más quiero' : 'Marcar'}
            </button>
          </div>
        </div>
        <Field label="Link (tienda, referencia)">
          <input
            className={inputCls}
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://…"
            onChange={(e) => setLink(e.target.value)}
            aria-invalid={!linkOk}
          />
        </Field>
        {wish.link_url && (
          <a
            href={wish.link_url}
            target="_blank"
            rel="noreferrer"
            className="-mt-2 inline-flex h-10 items-center gap-1.5 text-[14px] font-bold"
          >
            <Icon name="link" size={16} /> Abrir link
          </a>
        )}
        {!more ? (
          <button
            type="button"
            className="h-11 self-start text-[14px] font-bold text-primary-hover"
            onClick={() => setMore(true)}
          >
            Más detalles
          </button>
        ) : (
          <Field label="Notas (talla, color, modelo…)">
            <textarea
              className={`${inputCls} h-24 py-3`}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        )}

        <GhostButton
          onClick={() => {
            update.mutate({ id: wish.id, patch: { got_at: got ? null : new Date().toISOString() } });
            onClose();
          }}
        >
          <Icon name="check" size={18} /> {got ? 'Aún no lo tengo' : 'Ya lo tengo'}
        </GhostButton>
        <GhostButton
          danger
          onClick={() => {
            onDelete(wish);
            onClose();
          }}
        >
          <Icon name="trash" size={18} /> Eliminar deseo
        </GhostButton>
      </div>
    </Sheet>
  );
}

function OtherWishView({ wish, claim, onClose }: { wish: Wish; claim?: WishClaim | undefined; onClose: () => void }) {
  const { hid, userId, memberById } = useApp();
  const setClaim = useSetClaim(hid, userId);
  const owner = memberById(wish.owner_id);
  const ownerName = owner?.display_name ?? 'Tu pareja';
  const claimer = claim && claim.claimed_by !== userId ? memberById(claim.claimed_by) : undefined;
  const value: ClaimStatus | 'libre' = claim?.status ?? 'libre';
  const host = linkHost(wish.link_url);

  return (
    <Sheet open onClose={onClose} title={`Deseo de ${ownerName}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <WishTile wish={wish} size={64} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[19px] font-extrabold leading-tight">{wish.title}</span>
            <span className="text-[13px] font-semibold text-muted">
              {[
                wish.price_estimated_cents != null ? fmtMXN(wish.price_estimated_cents) : null,
                wish.starred ? 'Lo que más quiere' : null,
                wish.got_at ? 'Ya lo tiene' : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Sin precio'}
            </span>
          </div>
        </div>

        {wish.link_url && (
          <a
            href={wish.link_url}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center gap-2 rounded-[14px] border border-line bg-field px-3.5 text-[15px] font-bold"
          >
            <Icon name="link" size={18} /> Abrir {host ?? 'link'}
          </a>
        )}
        {wish.notes && (
          <p className="m-0 rounded-[14px] bg-soft p-3.5 text-[14px] font-medium whitespace-pre-wrap">{wish.notes}</p>
        )}

        {!wish.got_at && (
          <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-bg p-4">
            <h3 className="m-0 text-[15px] font-extrabold">Sorpresa</h3>
            <Segmented
              label="Estado del regalo"
              size="sm"
              value={value}
              onChange={(v) => setClaim.mutate({ wishId: wish.id, status: v === 'libre' ? null : v })}
              options={[
                { value: 'libre', label: 'Libre' },
                { value: 'apartado', label: 'Apartado' },
                { value: 'comprado', label: 'Comprado' },
              ]}
            />
            <p className="m-0 text-[12px] font-medium text-muted">
              {claimer ? `Lo apartó ${claimer.display_name}. ` : ''}
              {ownerName} no ve esto.
            </p>
          </section>
        )}
      </div>
    </Sheet>
  );
}
