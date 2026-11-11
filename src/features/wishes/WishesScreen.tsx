import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../../app/context';
import {
  newId,
  useCreateWish,
  useDeleteWish,
  useRestoreWish,
  useSetClaim,
  useUpdateWish,
  useWishClaims,
  useWishes,
  type Wish,
} from '../../data/wishes';
import { UNDO_MS } from '../../data/items';
import { fmtMXN } from '../../lib/money';
import { Icon } from '../../ui/Icon';
import { Avatar, EmptyCard, Spinner, haptic, useToast } from '../../ui/kit';
import { WishCard } from './WishCard';
import { WishSheet } from './WishSheet';
import { claimOf, openTotalCents, parseWishInput, wishesOf } from './select';

export function WishesScreen() {
  const { hid, userId, members } = useApp();
  const wishes = useWishes(hid);
  const claims = useWishClaims(hid);
  const update = useUpdateWish(hid);
  const del = useDeleteWish(hid);
  const restore = useRestoreWish(hid);
  const setClaim = useSetClaim(hid, userId);
  const toast = useToast();

  // Yo primero, luego los demás en orden de llegada.
  const people = useMemo(
    () => [...members].sort((a, b) => Number(b.user_id === userId) - Number(a.user_id === userId)),
    [members, userId],
  );
  const [selected, setOwnerId] = useState(userId);
  // Si la persona elegida ya no está en el hogar, volver a mi lista.
  const ownerId = people.some((m) => m.user_id === selected) ? selected : userId;
  const [openId, setOpenId] = useState<string | null>(null);
  const mine = ownerId === userId;
  const owner = people.find((m) => m.user_id === ownerId);

  const all = useMemo(() => wishes.data ?? [], [wishes.data]);
  const claimList = useMemo(() => claims.data ?? [], [claims.data]);
  const { open, got } = useMemo(() => wishesOf(all, ownerId), [all, ownerId]);
  const total = openTotalCents(open);
  const opened: Wish | null = all.find((w) => w.id === openId) ?? null;

  const remove = (w: Wish) => {
    haptic();
    del.mutate(w);
    toast(
      {
        text: `"${w.title.length > 28 ? `${w.title.slice(0, 27)}…` : w.title}" eliminado`,
        action: { label: 'Deshacer', run: () => restore.mutate(w) },
      },
      UNDO_MS,
    );
  };

  const toggleGot = (w: Wish) => {
    haptic();
    update.mutate({ id: w.id, patch: { got_at: w.got_at ? null : new Date().toISOString() } });
  };

  const cycleClaim = (w: Wish) => {
    const status = claimOf(claimList, w.id)?.status;
    if (status === 'comprado') {
      setOpenId(w.id);
      return;
    }
    haptic();
    setClaim.mutate({ wishId: w.id, status: status === 'apartado' ? 'comprado' : 'apartado' });
  };

  const card = (w: Wish) => (
    <li key={w.id}>
      <WishCard
        wish={w}
        mine={mine}
        claim={mine ? undefined : claimOf(claimList, w.id)}
        onOpen={() => setOpenId(w.id)}
        onStar={() => update.mutate({ id: w.id, patch: { starred: !w.starred } })}
        onToggleGot={() => toggleGot(w)}
        onDelete={() => remove(w)}
        onClaimTap={() => cycleClaim(w)}
      />
    </li>
  );

  const reserved = mine ? 0 : open.filter((w) => claimOf(claimList, w.id)).length;

  return (
    <main className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-x-10">
      <div className="contents md:sticky md:top-10 md:flex md:flex-col md:gap-4">
        <header className="flex flex-col gap-0.5">
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Deseos</h1>
          <span className="text-[13px] font-semibold text-muted">
            {mine ? 'Lo que te gustaría tener' : `Ideas para regalarle a ${owner?.display_name ?? 'tu pareja'}`}
          </span>
        </header>

        {people.length > 1 && (
          <div role="radiogroup" aria-label="Lista de" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {people.map((m) => {
              const on = m.user_id === ownerId;
              const count = wishesOf(all, m.user_id).open.length;
              return (
                <button
                  key={m.user_id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOwnerId(m.user_id)}
                  className={`flex h-12 shrink-0 items-center gap-2 rounded-full border py-1 pr-4 pl-1.5 text-[14px] font-bold ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                  }`}
                >
                  <Avatar member={m} size={34} />
                  {m.user_id === userId ? 'Mis deseos' : m.display_name}
                  <span className={`text-[12px] font-extrabold ${on ? 'text-white/75' : 'text-muted'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {mine ? (
          <AddWish />
        ) : (
          <p className="m-0 flex items-center gap-2 rounded-[14px] bg-soft px-3.5 py-3 text-[13px] font-semibold text-muted">
            <Icon name="sparkles" size={18} />
            {owner?.display_name ?? 'Tu pareja'} no ve lo que apartas o compras.
            {reserved > 0 && ` Llevas ${reserved}.`}
          </p>
        )}

        {open.length > 0 && (
          <div className="order-last flex items-center justify-between rounded-[var(--radius-card)] bg-hero px-4 py-3.5 text-white md:order-none">
            <span className="text-[13px] font-semibold text-on-hero">
              {open.length} {open.length === 1 ? 'deseo' : 'deseos'}
            </span>
            <span className="text-[18px] font-extrabold">{fmtMXN(total)}</span>
          </div>
        )}
      </div>

      <div className="contents md:flex md:flex-col md:gap-4">
        {wishes.isLoading && <Spinner />}
        {wishes.isError && <EmptyCard>No se pudieron cargar los deseos.</EmptyCard>}
        {wishes.isSuccess && open.length === 0 && got.length === 0 && (
          <EmptyCard>
            {mine
              ? 'Anota lo que te gustaría: un libro, unos tenis, una experiencia. Tu pareja lo verá para darte ideas.'
              : `${owner?.display_name ?? 'Tu pareja'} todavía no anota deseos.`}
          </EmptyCard>
        )}

        {open.length > 0 && <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{open.map(card)}</ul>}

        {got.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[14px] font-extrabold text-muted">
              {mine ? 'Ya lo tienes' : 'Ya lo tiene'} ({got.length})
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">{got.map(card)}</ul>
          </section>
        )}
      </div>

      <WishSheet
        wish={opened}
        claim={opened ? claimOf(claimList, opened.id) : undefined}
        onClose={() => setOpenId(null)}
        onDelete={remove}
      />
    </main>
  );
}

function AddWish() {
  const { hid, userId } = useApp();
  const create = useCreateWish(hid, userId);
  const [text, setText] = useState('');
  const parsed = parseWishInput(text);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.title) return;
    create.mutate({ id: newId(), title: parsed.title.slice(0, 200), price_estimated_cents: parsed.priceCents });
    setText('');
  };

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-[18px] border border-line bg-card py-1.5 pr-1.5 pl-3.5 focus-within:border-primary"
      >
        <label htmlFor="wish-add" className="sr-only">
          Agregar deseo
        </label>
        <input
          id="wish-add"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Audífonos $2,500"
          autoComplete="off"
          enterKeyHint="done"
          className="h-11 min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold text-ink outline-none placeholder:text-placeholder"
        />
        <button
          type="submit"
          aria-label="Agregar deseo"
          disabled={!parsed.title}
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary text-white disabled:bg-disabled"
        >
          <Icon name="plus" size={22} stroke={2.6} />
        </button>
      </form>
      <p className="m-0 px-1 text-[12px] font-medium text-muted">
        {parsed.priceCents != null ? (
          <>
            Precio: <b>{fmtMXN(parsed.priceCents)}</b>
          </>
        ) : (
          <>
            <b>$precio</b> opcional · la estrella marca lo que más quieres
          </>
        )}
      </p>
    </div>
  );
}
