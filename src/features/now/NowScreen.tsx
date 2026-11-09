import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/context';
import { useItems } from '../../data/items';
import { useBalances } from '../../data/budgets';
import { useEvents } from '../../data/events';
import { fmtMXN } from '../../lib/money';
import { fmtLongDate } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { useTheme } from '../../lib/useTheme';
import { Avatar, SectionTitle } from '../../ui/kit';
import { ItemCard } from '../items/ItemCard';
import { ItemSheet } from '../items/ItemSheet';
import { progressOf } from '../items/select';
import { useItemToggle } from '../items/useItemToggle';
import { useDeleteWithUndo } from '../items/useDeleteWithUndo';
import { useSetPriority } from '../items/usePriority';
import { EventRow } from '../agenda/EventCard';
import { EventSheet, type EventTarget } from '../agenda/EventSheet';
import { SettingsSheet } from '../settings/SettingsSheet';
import { buildToday } from './today';

const R = 19;
const C = 2 * Math.PI * R;

function MiniRing({ pct }: { pct: number }) {
  return (
    <span className="relative size-12 shrink-0" role="img" aria-label={`Casa lista al ${pct}%`}>
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={R} fill="none" stroke="var(--color-track)" strokeWidth="5" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          transform="rotate(-90 24 24)"
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[12px] font-extrabold">
        {pct}%
      </span>
    </span>
  );
}

export function NowScreen() {
  const { hid, members } = useApp();
  const items = useItems(hid);
  const balances = useBalances(hid);
  const events = useEvents(hid);
  const { toggle, sheet } = useItemToggle();
  const [openId, setOpenId] = useState<string | null>(null);
  const [eventTarget, setEventTarget] = useState<EventTarget>(null);
  const [settings, setSettings] = useState(false);
  const theme = useTheme();
  const removeItem = useDeleteWithUndo();
  const priority = useSetPriority();

  const all = useMemo(() => items.data ?? [], [items.data]);
  const prog = progressOf(all);
  const today = useMemo(() => buildToday(all, events.data ?? []), [all, events.data]);
  const main = balances.data?.[0];
  const loading = items.isPending || events.isPending;

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MiniRing pct={prog.pct} />
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold text-muted">{fmtLongDate(new Date())}</span>
            <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-tight">Nuestra casa</h1>
            <span className="text-[13px] font-semibold text-muted">
              {prog.total ? `${prog.done} de ${prog.total} hechos` : 'Sin pendientes todavía'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={theme.toggle}
            aria-label={theme.current === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
            className="flex size-11 items-center justify-center rounded-full text-muted"
          >
            <Icon name={theme.current === 'dark' ? 'sun' : 'moon'} size={22} />
          </button>
          <button
            type="button"
            onClick={() => setSettings(true)}
            aria-label="Hogar y ajustes"
            className="flex min-h-11 items-center"
          >
            {members.map((m, i) => (
              <span key={m.user_id} style={{ marginLeft: i ? -12 : 0 }}>
                <Avatar member={m} size={36} ring />
              </span>
            ))}
            {members.length < 2 && (
              <span className="-ml-3 flex size-9 items-center justify-center rounded-full border-2 border-dashed border-dashed bg-card text-primary-hover">
                <Icon name="plus" size={16} stroke={2.6} />
              </span>
            )}
          </button>
        </div>
      </header>

      {main && (
        <Link
          to="/presupuesto"
          className="flex min-h-12 items-center justify-between rounded-[18px] border border-line bg-card px-4 text-[14px] font-bold text-ink no-underline"
        >
          <span className="flex items-center gap-2 text-muted">
            <Icon name="wallet" size={18} />
            Presupuesto · {main.name}
          </span>
          <span className="flex items-center gap-1">
            <span className={main.available_cents < 0 ? 'text-gasto' : ''}>{fmtMXN(main.available_cents)}</span>
            <Icon name="chevronRight" size={18} stroke={2.2} />
          </span>
        </Link>
      )}

      <section className="flex flex-col gap-2.5" aria-label="Hoy">
        <SectionTitle
          right={
            <Link to="/pendientes" className="py-2.5 text-[14px] font-bold no-underline">
              Ver todo
            </Link>
          }
        >
          Hoy
        </SectionTitle>
        {loading ? null : today.entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-line bg-card px-5 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-tarea-tint text-tarea-fg">
              <Icon name="sparkles" size={24} />
            </span>
            <span className="text-[18px] font-extrabold">Día libre</span>
            <span className="text-[14px] font-medium text-muted">
              {all.length ? 'Nada urgente ni pendiente para hoy.' : 'Agrega tu primer pendiente con el botón +'}
            </span>
          </div>
        ) : (
          <>
            {today.entries.map((e) =>
              e.event ? (
                <EventRow key={e.event.id} ev={e.event} onOpen={() => e.event && setEventTarget({ kind: 'edit', event: e.event })} />
              ) : e.item ? (
                <ItemCard
                  key={e.item.id}
                  item={e.item}
                  onToggle={() => e.item && toggle(e.item)}
                  onOpen={() => setOpenId(e.item?.id ?? null)}
                  onDelete={() => e.item && removeItem(e.item)}
                  onToggleUrgent={() => e.item && priority.toggleUrgent(e.item)}
                />
              ) : null,
            )}
            {today.hiddenItems > 0 && (
              <Link to="/pendientes" className="self-center py-2.5 text-[14px] font-bold no-underline">
                {today.hiddenItems} más en Pendientes
              </Link>
            )}
          </>
        )}
      </section>


      <ItemSheet item={all.find((i) => i.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <EventSheet target={eventTarget} onClose={() => setEventTarget(null)} />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      {sheet}
    </main>
  );
}
