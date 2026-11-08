import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/context';
import { useItems } from '../../data/items';
import { useBalances } from '../../data/budgets';
import { useEvents } from '../../data/events';
import { fmtMXN } from '../../lib/money';
import { fmtLongDate } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { Avatar, EmptyCard, SectionTitle } from '../../ui/kit';
import { ItemCard } from '../items/ItemCard';
import { ItemSheet } from '../items/ItemSheet';
import { progressOf, topUrgent } from '../items/select';
import { useItemToggle } from '../items/useItemToggle';
import { EventRow } from '../agenda/EventCard';
import { EventSheet, type EventTarget } from '../agenda/EventSheet';
import { upcoming } from '../agenda/select';
import { SettingsSheet } from '../settings/SettingsSheet';

const R = 36;
const C = 2 * Math.PI * R;

export function NowScreen() {
  const { hid, members } = useApp();
  const items = useItems(hid);
  const balances = useBalances(hid);
  const events = useEvents(hid);
  const { toggle, sheet } = useItemToggle();
  const [openId, setOpenId] = useState<string | null>(null);
  const [eventTarget, setEventTarget] = useState<EventTarget>(null);
  const [settings, setSettings] = useState(false);

  const all = useMemo(() => items.data ?? [], [items.data]);
  const prog = progressOf(all);
  const urgent = topUrgent(all);
  const next = upcoming(events.data ?? [], new Date());
  const main = balances.data?.[0];
  const spentPct = main && main.added_cents > 0 ? Math.min(100, (main.spent_cents / main.added_cents) * 100) : 0;

  return (
    <main className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-x-10 md:gap-y-5">
      <header className="flex items-center justify-between md:col-span-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">{fmtLongDate(new Date())}</span>
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Nuestra casa</h1>
        </div>
        <button
          type="button"
          onClick={() => setSettings(true)}
          aria-label="Hogar y ajustes"
          className="flex min-h-11 items-center"
        >
          {members.map((m, i) => (
            <span key={m.user_id} style={{ marginLeft: i ? -12 : 0 }}>
              <Avatar member={m} size={38} ring />
            </span>
          ))}
          {members.length < 2 && (
            <span className="-ml-3 flex size-[38px] items-center justify-center rounded-full border-2 border-dashed border-dashed bg-card text-primary-hover">
              <Icon name="plus" size={16} stroke={2.6} />
            </span>
          )}
        </button>
      </header>

      <div className="contents md:flex md:flex-col md:gap-5">
        <section className="flex items-center gap-[18px] rounded-[var(--radius-hero)] bg-primary p-5 text-white">
          <div className="relative size-[88px] shrink-0" role="img" aria-label={`${prog.pct}% de pendientes hechos`}>
            <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
              <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="10" />
              <circle
                cx="44"
                cy="44"
                r={R}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(prog.pct / 100) * C} ${C}`}
                transform="rotate(-90 44 44)"
                style={{ transition: 'stroke-dasharray .4s ease' }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-[22px] font-extrabold"
              aria-hidden="true"
            >
              {prog.pct}%
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[13px] font-semibold text-[#E4E0FF]">Casa lista para los niños</span>
            <span className="text-[22px] font-extrabold">
              {prog.done} de {prog.total} hechos
            </span>
            {prog.urgentPending > 0 && (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-bold">
                {prog.urgentPending} urgente{prog.urgentPending === 1 ? '' : 's'} por resolver
              </span>
            )}
          </div>
        </section>

        {main && (
          <Link
            to="/presupuesto"
            className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-card px-[18px] py-4 text-ink no-underline"
          >
            <span className="flex items-center justify-between text-[13px] font-bold text-muted">
              Presupuesto · {main.name}
              <Icon name="chevronRight" size={18} stroke={2.2} />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span
                className={`text-[28px] font-extrabold tracking-tight ${main.available_cents < 0 ? 'text-gasto' : ''}`}
              >
                {fmtMXN(main.available_cents)}
              </span>
              <span className="text-[14px] font-semibold text-muted">disponibles</span>
            </span>
            <span className="h-2.5 overflow-hidden rounded-full bg-track">
              <span className="block h-2.5 rounded-full bg-primary" style={{ width: `${spentPct}%` }} />
            </span>
            <span className="text-[12px] font-semibold text-muted">
              Gastado {fmtMXN(main.spent_cents)} de {fmtMXN(main.added_cents)}
            </span>
          </Link>
        )}
      </div>

      <div className="contents md:flex md:flex-col md:gap-5">
        <section className="flex flex-col gap-2.5">
          <SectionTitle
            dot="#E5484D"
            right={
              <Link to="/pendientes" className="py-2.5 text-[14px] font-bold no-underline">
                Ver todo
              </Link>
            }
          >
            Urgente
          </SectionTitle>
          {urgent.length === 0 ? (
            <EmptyCard>{all.length ? 'Nada urgente. Bien.' : 'Agrega tu primer pendiente con el botón +'}</EmptyCard>
          ) : (
            urgent.map((it) => (
              <ItemCard key={it.id} item={it} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />
            ))
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <SectionTitle
            right={
              <Link to="/agenda" className="py-2.5 text-[14px] font-bold no-underline">
                Agenda
              </Link>
            }
          >
            Próximo
          </SectionTitle>
          {next.length === 0 ? (
            <EmptyCard>Sin eventos próximos.</EmptyCard>
          ) : (
            next.map((ev) => (
              <EventRow key={ev.id} ev={ev} onOpen={() => setEventTarget({ kind: 'edit', event: ev })} />
            ))
          )}
        </section>
      </div>

      <ItemSheet item={all.find((i) => i.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <EventSheet target={eventTarget} onClose={() => setEventTarget(null)} />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      {sheet}
    </main>
  );
}
