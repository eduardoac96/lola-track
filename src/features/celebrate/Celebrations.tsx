import { useEffect, useRef, useState } from 'react';
import { useItems } from '../../data/items';
import { Icon } from '../../ui/Icon';
import { haptic } from '../../ui/kit';
import { progressOf } from '../items/select';
import {
  MILESTONE_TEXT,
  milestoneToCelebrate,
  reachedMilestone,
  readSeen,
  urgentCleared,
  writeSeen,
  type Snap,
} from './logic';

interface Moment {
  id: number;
  title: string;
  body: string;
}

/** Momentos de festejo: todo lo urgente listo y los hitos de "casa lista". Sin rachas ni puntos. */
export function Celebrations({ hid }: { hid: string }) {
  const items = useItems(hid);
  const [moment, setMoment] = useState<Moment | null>(null);
  const prev = useRef<Snap | null>(null);

  useEffect(() => {
    if (!items.data) return;
    const p = progressOf(items.data);
    let next: Omit<Moment, 'id'> | null = null;

    const seen = readSeen(hid);
    if (seen == null) {
      // Primera vez en este dispositivo: registrar en silencio lo ya alcanzado.
      writeSeen(hid, reachedMilestone(p.pct, p.total));
    } else {
      const m = milestoneToCelebrate(p.pct, p.total, seen);
      if (m) {
        writeSeen(hid, m);
        next = MILESTONE_TEXT[m];
      }
    }
    const snap = { urgentPending: p.urgentPending, done: p.done };
    if (!next && urgentCleared(prev.current, snap)) {
      next = { title: '¡Todo lo urgente listo!', body: 'Lo que más apuraba ya está hecho.' };
    }
    prev.current = snap;

    if (next) {
      haptic();
      const n = next;
      // Fuera del render: el efecto sincroniza con datos externos (la cache).
      queueMicrotask(() => setMoment({ id: Date.now(), ...n }));
    }
  }, [items.data, hid]);

  useEffect(() => {
    if (!moment) return;
    const t = setTimeout(() => setMoment(null), 3200);
    return () => clearTimeout(t);
  }, [moment]);

  if (!moment) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        key={moment.id}
        role="status"
        aria-live="polite"
        onClick={() => setMoment(null)}
        className="pointer-events-auto flex max-w-[320px] flex-col items-center gap-2 rounded-[28px] bg-primary px-7 py-6 text-center text-white shadow-[0_20px_60px_rgba(28,26,43,0.35)]"
        style={{ animation: 'pop .45s ease-out' }}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-white/20">
          <Icon name="sparkles" size={30} />
        </span>
        <span className="text-[22px] font-extrabold">{moment.title}</span>
        <span className="text-[14px] font-semibold text-white/85">{moment.body}</span>
      </button>
    </div>
  );
}
