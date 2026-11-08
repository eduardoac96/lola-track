import { Link } from 'react-router';
import type { CalEvent } from '../../data/events';
import type { Item } from '../../data/items';
import { fmtDayChip, fmtDuration, fmtTime } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { durationMinutes } from './select';

export function EventCard({ ev, linked, onOpen }: { ev: CalEvent; linked?: Item | undefined; onOpen: () => void }) {
  const start = new Date(ev.starts_at);
  const dur = durationMinutes(ev);
  return (
    <div className="flex gap-3.5 rounded-[20px] border border-line bg-card p-4">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-3.5 text-left">
        <span className="flex w-14 shrink-0 flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">{fmtTime(start)}</span>
          {dur != null && <span className="text-[11px] font-bold text-muted">{fmtDuration(dur)}</span>}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[16px] font-extrabold">{ev.title}</span>
          {ev.place && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
              <Icon name="pin" size={14} stroke={2.2} />
              <span className="truncate">{ev.place}</span>
            </span>
          )}
          {ev.remind_minutes != null && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
              <Icon name="bell" size={13} stroke={2.2} /> Aviso
            </span>
          )}
        </span>
      </button>
      {linked && (
        <Link
          to="/pendientes"
          className="self-start rounded-full bg-arreglo-tint px-2.5 py-1.5 text-[12px] font-bold text-arreglo-fg no-underline"
        >
          {linked.title}
        </Link>
      )}
    </div>
  );
}

export function EventRow({ ev, onOpen, now = new Date() }: { ev: CalEvent; onOpen: () => void; now?: Date }) {
  const start = new Date(ev.starts_at);
  const chip = fmtDayChip(start, now);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3.5 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-left"
    >
      <span className="flex w-14 shrink-0 flex-col items-center">
        <span className={`text-[11px] font-extrabold ${chip === 'HOY' ? 'text-[#B4232A]' : 'text-muted'}`}>{chip}</span>
        <span className="text-[17px] font-extrabold">{fmtTime(start)}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold">{ev.title}</span>
        {ev.place && <span className="truncate text-[12px] font-medium text-muted">{ev.place}</span>}
      </span>
    </button>
  );
}
