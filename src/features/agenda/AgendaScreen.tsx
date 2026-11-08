import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { useEvents } from '../../data/events';
import { useItems } from '../../data/items';
import { addDays, dowShort, fmtDayTitle, isSameDay, startOfDay } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { EmptyCard, SectionTitle, Spinner } from '../../ui/kit';
import { EventCard, EventRow } from './EventCard';
import { EventSheet, type EventTarget } from './EventSheet';
import { eventsAfter, eventsOn, weekFrom } from './select';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function AgendaScreen() {
  const { hid } = useApp();
  const events = useEvents(hid);
  const items = useItems(hid);
  const today = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(today);
  const [selected, setSelected] = useState(today);
  const [target, setTarget] = useState<EventTarget>(null);

  const all = useMemo(() => events.data ?? [], [events.data]);
  const days = weekFrom(weekStart);
  const dayEvents = eventsOn(all, selected);
  const later = eventsAfter(all, selected);
  const itemById = (id: string | null) => (id ? items.data?.find((i) => i.id === id) : undefined);

  const shiftWeek = (n: number) => {
    const next = addDays(weekStart, n * 7);
    const clamped = next < today ? today : next;
    setWeekStart(clamped);
    setSelected(clamped);
  };

  return (
    <main className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start md:gap-x-10">
      <div className="contents md:flex md:flex-col md:gap-4">
        <header className="flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-muted">
              {MONTHS[selected.getMonth()]} {selected.getFullYear()}
            </span>
            <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Agenda</h1>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Semana anterior"
              disabled={isSameDay(weekStart, today)}
              onClick={() => shiftWeek(-1)}
              className="flex size-11 items-center justify-center rounded-full bg-card text-ink disabled:opacity-35"
            >
              <Icon name="chevronLeft" size={20} />
            </button>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => shiftWeek(1)}
              className="flex size-11 items-center justify-center rounded-full bg-card text-ink"
            >
              <Icon name="chevronRight" size={20} />
            </button>
          </div>
        </header>

        <div role="radiogroup" aria-label="Elegir día" className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const on = isSameDay(d, selected);
            const has = eventsOn(all, d).length > 0;
            return (
              <button
                key={d.toISOString()}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${fmtDayTitle(d)}${has ? ', con eventos' : ''}`}
                onClick={() => setSelected(d)}
                className={`flex h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl border ${
                  on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                }`}
              >
                <span className="text-[11px] font-bold">{dowShort(d)}</span>
                <span className="text-[18px] font-extrabold">{d.getDate()}</span>
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: has ? (on ? '#FFFFFF' : 'var(--color-primary-hover)') : 'transparent' }}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setTarget({ kind: 'new', day: selected })}
          className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-dashed bg-card text-[15px] font-bold text-primary-hover"
        >
          <Icon name="plus" size={20} stroke={2.6} /> Agregar{' '}
          {isSameDay(selected, today) ? 'hoy' : `el ${fmtDayTitle(selected).toLowerCase()}`}
        </button>

        {events.isLoading && <Spinner />}

        <section className="flex flex-col gap-2.5">
          <SectionTitle>{fmtDayTitle(selected)}</SectionTitle>
          {dayEvents.length === 0 ? (
            <EmptyCard>Día libre. Nada agendado.</EmptyCard>
          ) : (
            dayEvents.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                linked={itemById(ev.item_id)}
                onOpen={() => setTarget({ kind: 'edit', event: ev })}
              />
            ))
          )}
        </section>
      </div>

      <div className="contents md:flex md:flex-col md:gap-4 md:pt-[88px]">
        {later.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle>Después</SectionTitle>
            {later.map((ev) => (
              <EventRow key={ev.id} ev={ev} onOpen={() => setTarget({ kind: 'edit', event: ev })} />
            ))}
          </section>
        )}
      </div>

      <EventSheet target={target} onClose={() => setTarget(null)} />
    </main>
  );
}
