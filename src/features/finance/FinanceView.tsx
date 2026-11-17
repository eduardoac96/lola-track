import { useMemo, useState } from 'react';
import { useApp } from '../../app/context';
import {
  newId,
  useFinAccounts,
  useFinChecks,
  useFinItems,
  useSaveFinItem,
  useToggleCheck,
  type FinAccount,
  type FinCheck,
  type FinItem,
} from '../../data/finance';
import { fmtMXN } from '../../lib/money';
import { Icon } from '../../ui/Icon';
import { EmptyCard, Segmented, Spinner, haptic } from '../../ui/kit';
import { currentPeriod, pct, periodLabel, shiftPeriod, summarize, type PayDay, type Period } from './period';
import { AccountSheet, ItemEditSheet, type ItemDraft } from './FinanceSheets';

/** Mis finanzas: solo el dueño ve estas filas (RLS por owner_id). */
export function FinanceView() {
  const { hid, userId } = useApp();
  const items = useFinItems(hid, userId);
  const checks = useFinChecks(hid, userId);
  const accounts = useFinAccounts(hid, userId);
  const toggle = useToggleCheck(hid, userId);
  const save = useSaveFinItem(hid, userId);
  const [period, setPeriod] = useState<Period>(() => currentPeriod(new Date()));
  const [tab, setTab] = useState<'quincena' | 'extras' | 'saldos'>('quincena');
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [account, setAccount] = useState<FinAccount | 'new' | null>(null);

  const all = useMemo(() => items.data ?? [], [items.data]);
  const lines = useMemo(() => all.filter((i) => i.section === 'quincena' && i.grp === period.grp), [all, period.grp]);
  const checkByItem = useMemo(() => {
    const m = new Map<string, FinCheck>();
    for (const c of checks.data ?? []) if (c.period === period.key) m.set(c.item_id, c);
    return m;
  }, [checks.data, period.key]);
  const s = summarize(lines, new Set(checkByItem.keys()));

  const extras = useMemo(() => {
    const groups = new Map<string, FinItem[]>();
    for (const i of all) {
      if (i.section !== 'extra') continue;
      const g = groups.get(i.grp) ?? [];
      g.push(i);
      groups.set(i.grp, g);
    }
    return [...groups.entries()];
  }, [all]);

  if (items.isLoading || checks.isLoading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Vista de mis finanzas"
        size="sm"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'quincena', label: 'Quincena' },
          { value: 'extras', label: 'Extras' },
          { value: 'saldos', label: 'Saldos' },
        ]}
      />

      {tab === 'quincena' && (
        <>
          <section className="flex flex-col gap-3 rounded-[var(--radius-hero)] bg-hero px-5 py-5 text-white">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Quincena anterior"
                onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
                className="-ml-2 flex size-11 items-center justify-center rounded-full text-on-hero"
              >
                <Icon name="chevronLeft" />
              </button>
              <span className="text-[14px] font-bold text-on-hero">Quincena del {periodLabel(period)}</span>
              <button
                type="button"
                aria-label="Quincena siguiente"
                onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
                className="-mr-2 flex size-11 items-center justify-center rounded-full text-on-hero"
              >
                <Icon name="chevronRight" />
              </button>
            </div>
            <span className="text-[13px] font-semibold text-on-hero">Falta por pagar</span>
            <span className="text-[44px] leading-none font-extrabold tracking-tight">{fmtMXN(s.total - s.done)}</span>
            <div
              className="h-3 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Pagado de la quincena"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct(s.done, s.total))}
            >
              <div
                className="h-3 rounded-full bg-done transition-[width]"
                style={{ width: `${pct(s.done, s.total)}%` }}
              />
            </div>
            <div className="flex justify-between text-[12px] font-semibold text-on-hero">
              <span>
                {s.doneCount} de {s.count} listos
              </span>
              <span>Total {fmtMXN(s.total)}</span>
            </div>
          </section>

          <LineList
            rows={lines}
            isDone={(i) => checkByItem.has(i.id)}
            onToggle={(i) => {
              haptic();
              toggle.mutate({ itemId: i.id, period: period.key, existing: checkByItem.get(i.id), id: newId() });
            }}
            onOpen={(i) => setDraft({ item: i })}
          />
          <AddButton
            label={`Agregar al ${period.grp === '15' ? '15' : '30'}`}
            onClick={() => setDraft({ section: 'quincena', grp: period.grp })}
          />
        </>
      )}

      {tab === 'extras' && (
        <>
          {extras.length === 0 && (
            <EmptyCard>Aguinaldo, bonos o fondo de ahorro: agrega cómo vas a repartirlos.</EmptyCard>
          )}
          {extras.map(([grp, rows]) => {
            const sx = summarize(rows, new Set(rows.filter((r) => r.done_at).map((r) => r.id)));
            return (
              <section key={grp} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="m-0 text-[18px] font-extrabold">{grp}</h2>
                  <span className="text-[13px] font-bold text-muted">
                    {sx.doneCount}/{sx.count} · {fmtMXN(sx.total)}
                  </span>
                </div>
                <LineList
                  rows={rows}
                  isDone={(i) => !!i.done_at}
                  onToggle={(i) => {
                    haptic();
                    save.mutate({ id: i.id, isNew: false, done_at: i.done_at ? null : new Date().toISOString() });
                  }}
                  onOpen={(i) => setDraft({ item: i })}
                />
              </section>
            );
          })}
          <AddButton label="Agregar extra" onClick={() => setDraft({ section: 'extra', grp: extras[0]?.[0] ?? '' })} />
        </>
      )}

      {tab === 'saldos' && (
        <>
          {(accounts.data ?? []).length === 0 && <EmptyCard>Agrega tus deudas y tu fondo de emergencia.</EmptyCard>}
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {(accounts.data ?? []).map((a) => (
              <li key={a.id}>
                <AccountCard a={a} onOpen={() => setAccount(a)} />
              </li>
            ))}
          </ul>
          <AddButton label="Agregar deuda o meta" onClick={() => setAccount('new')} />
        </>
      )}

      <ItemEditSheet draft={draft} groups={extras.map(([g]) => g)} onClose={() => setDraft(null)} />
      <AccountSheet account={account} onClose={() => setAccount(null)} />
    </div>
  );
}

const KIND_DOT: Record<string, string> = {
  deuda: 'var(--color-prio-urgente)',
  ahorro: 'var(--color-done)',
  gasto: 'var(--color-prio-algun)',
};

function LineList({
  rows,
  isDone,
  onToggle,
  onOpen,
}: {
  rows: FinItem[];
  isDone: (i: FinItem) => boolean;
  onToggle: (i: FinItem) => void;
  onOpen: (i: FinItem) => void;
}) {
  if (rows.length === 0) return <EmptyCard>Sin líneas.</EmptyCard>;
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border border-line bg-card p-0">
      {rows.map((i, n) => {
        const done = isDone(i);
        return (
          <li
            key={i.id}
            className={`flex items-center gap-3 px-3 py-1.5 ${n === rows.length - 1 ? '' : 'border-b border-line-soft'}`}
          >
            <button
              type="button"
              onClick={() => onToggle(i)}
              aria-label={done ? `Desmarcar ${i.name}` : `Marcar ${i.name} como pagado`}
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
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: KIND_DOT[i.kind] }}
                aria-hidden="true"
              />
              <span className={`flex-1 truncate text-[15px] font-bold ${done ? 'text-muted line-through' : ''}`}>
                {i.name}
              </span>
              <span className={`text-[15px] font-extrabold ${done ? 'text-muted' : ''}`}>{fmtMXN(i.amount_cents)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AccountCard({ a, onOpen }: { a: FinAccount; onOpen: () => void }) {
  const meta = a.kind === 'meta';
  const progress = meta && a.target_cents ? pct(a.balance_cents, a.target_cents) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-[20px] border border-line bg-card px-4 py-3.5 text-left"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          <span
            className="size-2 rounded-full"
            style={{ background: meta ? KIND_DOT.ahorro : KIND_DOT.deuda }}
            aria-hidden="true"
          />
          {a.name}
        </span>
        <span
          className={`text-[17px] font-extrabold ${meta ? 'text-abono' : a.balance_cents > 0 ? 'text-gasto' : 'text-abono'}`}
        >
          {meta || a.balance_cents > 0 ? fmtMXN(a.balance_cents) : 'Liquidada'}
        </span>
      </span>
      {meta && a.target_cents && (
        <>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-track"
            role="progressbar"
            aria-label={`Avance de ${a.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className="h-2.5 rounded-full bg-done" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[12px] font-semibold text-muted">
            {Math.round(progress)}% de {fmtMXN(a.target_cents)}
          </span>
        </>
      )}
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-dashed text-[15px] font-bold text-primary-hover"
    >
      <Icon name="plus" size={20} /> {label}
    </button>
  );
}

export type { PayDay };
