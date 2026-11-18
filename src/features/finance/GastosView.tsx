import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import { newId, useAddGasto, useDeleteMovement, type FinItem, type FinMovement } from '../../data/finance';
import { dayKey } from '../../lib/dates';
import { fmtMXN, parsePesos } from '../../lib/money';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { EmptyCard, Field, GhostButton, PrimaryButton, haptic, inputCls } from '../../ui/kit';
import { monthLabel, monthSpending, pct } from './period';

/** Gastos del día a día: registrar en 2 toques y ver el mes contra lo planeado. */
export function GastosView({ movements, lines }: { movements: FinMovement[]; lines: FinItem[] }) {
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<FinMovement | null>(null);
  const shift = (dir: 1 | -1) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const { total, rows } = useMemo(() => monthSpending(movements, lines, ym.y, ym.m), [movements, lines, ym]);
  const prefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-`;
  const list = movements.filter((m) => m.direction === 'gasto' && m.occurred_on.startsWith(prefix));
  const categories = useMemo(
    () => [...new Set(lines.filter((l) => l.section === 'quincena' && l.kind === 'gasto').map((l) => l.name))],
    [lines],
  );

  return (
    <>
      <section className="flex flex-col gap-2 rounded-[var(--radius-hero)] bg-hero px-5 py-5 text-white">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => shift(-1)}
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-on-hero"
          >
            <Icon name="chevronLeft" />
          </button>
          <span className="text-[14px] font-bold text-on-hero first-letter:uppercase">{monthLabel(ym.y, ym.m)}</span>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => shift(1)}
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-on-hero"
          >
            <Icon name="chevronRight" />
          </button>
        </div>
        <span className="text-[13px] font-semibold text-on-hero">Gastado</span>
        <span className="text-[44px] leading-none font-extrabold tracking-tight">{fmtMXN(total)}</span>
      </section>

      <PrimaryButton onClick={() => setAdding(true)}>
        <span className="flex items-center justify-center gap-2">
          <Icon name="plus" size={20} /> Registrar gasto
        </span>
      </PrimaryButton>

      {rows.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 rounded-[20px] border border-line bg-card p-4">
          {rows.map((r) => {
            const over = r.planned > 0 && r.spent > r.planned;
            return (
              <li key={r.category} className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-bold">{r.category}</span>
                  <span className={`text-[14px] font-extrabold ${over ? 'text-gasto' : ''}`}>
                    {fmtMXN(r.spent)}
                    {r.planned > 0 && <span className="font-semibold text-muted"> / {fmtMXN(r.planned)}</span>}
                  </span>
                </span>
                {r.planned > 0 && (
                  <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${pct(r.spent, r.planned)}%`,
                        background: over ? 'var(--color-prio-urgente)' : 'var(--color-done)',
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {list.length === 0 ? (
        <EmptyCard>Sin gastos este mes.</EmptyCard>
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border border-line bg-card p-0">
          {list.map((m, n) => (
            <li key={m.id} className={n === list.length - 1 ? '' : 'border-b border-line-soft'}>
              <button
                type="button"
                onClick={() => setOpen(m)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-bold">{m.concept ?? m.category ?? 'Gasto'}</span>
                  <span className="text-[12px] font-semibold text-muted">
                    {fmtShort(m.occurred_on)}
                    {m.category && m.concept ? ` · ${m.category}` : ''}
                  </span>
                </span>
                <span className="text-[15px] font-extrabold">{fmtMXN(m.amount_cents)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && <GastoSheet categories={categories} onClose={() => setAdding(false)} />}
      {open && <GastoDetail m={open} onClose={() => setOpen(null)} />}
    </>
  );
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
}

function GastoSheet({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const { hid, userId } = useApp();
  const add = useAddGasto(hid, userId);
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(() => dayKey(new Date()));
  const cents = parsePesos(amount);
  const valid = cents != null && cents > 0 && !!date;

  const submit = () => {
    if (!valid) return;
    haptic();
    add.mutate({
      id: newId(),
      amount_cents: cents,
      concept: concept.trim() || null,
      category,
      occurred_on: date,
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Registrar gasto"
      footer={
        <PrimaryButton disabled={!valid} onClick={submit}>
          Guardar
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Monto">
          <input
            className={inputCls}
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$0"
          />
        </Field>
        <Field label="Concepto (opcional)">
          <input className={inputCls} maxLength={80} value={concept} onChange={(e) => setConcept(e.target.value)} />
        </Field>
        {categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-muted">Categoría</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={category === c}
                  onClick={() => setCategory((p) => (p === c ? null : c))}
                  className={`min-h-11 rounded-full px-4 text-[14px] font-bold ${
                    category === c ? 'bg-hero text-white' : 'border border-line bg-card'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <Field label="Fecha">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function GastoDetail({ m, onClose }: { m: FinMovement; onClose: () => void }) {
  const { hid, userId } = useApp();
  const del = useDeleteMovement(hid, userId);
  return (
    <Sheet
      open
      onClose={onClose}
      title={m.concept ?? m.category ?? 'Gasto'}
      footer={
        <GhostButton
          danger
          onClick={() => {
            del.mutate(m);
            onClose();
          }}
        >
          Eliminar gasto
        </GhostButton>
      }
    >
      <div className="flex flex-col gap-1">
        <span className="text-[34px] font-extrabold">{fmtMXN(m.amount_cents)}</span>
        <span className="text-[14px] font-semibold text-muted">
          {fmtShort(m.occurred_on)}
          {m.category ? ` · ${m.category}` : ''}
        </span>
      </div>
    </Sheet>
  );
}
