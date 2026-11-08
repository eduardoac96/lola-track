import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/context';
import {
  getLastBudget,
  setLastBudget,
  useAddMovement,
  useBalances,
  useCreateBudget,
  useDeleteMovement,
  useMovements,
  type Movement,
} from '../../data/budgets';
import { newId } from '../../data/cache';
import { fmtMXN, parsePesos } from '../../lib/money';
import { fmtRelative } from '../../lib/dates';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Avatar, EmptyCard, Field, PrimaryButton, Spinner, haptic, inputCls, useToast } from '../../ui/kit';
import { AmountSheet, type AmountMode } from './AmountSheet';

export function BudgetScreen() {
  const { hid, userId, memberById } = useApp();
  const balances = useBalances(hid);
  const movements = useMovements(hid);
  const add = useAddMovement(hid, userId);
  const del = useDeleteMovement(hid);
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(getLastBudget());
  const [mode, setMode] = useState<AmountMode | null>(null);
  const [creating, setCreating] = useState(false);

  const list = balances.data ?? [];
  const current = list.find((b) => b.budget_id === selected) ?? list[0];
  const movs = useMemo(
    () => (movements.data ?? []).filter((m) => m.budget_id === current?.budget_id),
    [movements.data, current?.budget_id],
  );

  useEffect(() => {
    if (current) setLastBudget(current.budget_id);
  }, [current?.budget_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (m: Movement) => {
    haptic();
    del.mutate(m);
    toast({
      text: `Movimiento eliminado (${fmtMXN(m.amount_cents, 'always')})`,
      action: {
        label: 'Deshacer',
        run: () =>
          add.mutate({
            id: m.id,
            budget_id: m.budget_id,
            amount_cents: m.amount_cents,
            concept: m.concept,
            created_at: m.created_at,
          }),
      },
    });
  };

  const spentPct =
    current && current.added_cents > 0 ? Math.min(100, (current.spent_cents / current.added_cents) * 100) : 0;
  const negative = (current?.available_cents ?? 0) < 0;

  return (
    <main className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[30px] font-extrabold tracking-tight">Presupuesto</h1>
        <div role="radiogroup" aria-label="Bolsas" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {list.map((b) => {
            const on = b.budget_id === current?.budget_id;
            return (
              <button
                key={b.budget_id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSelected(b.budget_id)}
                className={`h-10 shrink-0 rounded-full border-2 px-4 text-[14px] font-bold ${
                  on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                }`}
              >
                {b.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-10 shrink-0 rounded-full border-2 border-dashed border-dashed px-3.5 text-[14px] font-bold text-primary-hover"
          >
            + Nueva bolsa
          </button>
        </div>
      </header>

      {balances.isLoading && <Spinner />}
      {current && (
        <div className="contents md:grid md:grid-cols-2 md:items-start md:gap-x-10">
          <div className="contents md:flex md:flex-col md:gap-4">
            <section className="flex flex-col gap-3 rounded-[var(--radius-hero)] bg-hero px-5 py-5 text-white">
              <span className="text-[13px] font-semibold text-on-hero">Disponible en {current.name}</span>
              <span
                className={`text-[44px] leading-none font-extrabold tracking-tight ${negative ? 'text-[#FF8A8F]' : ''}`}
              >
                {fmtMXN(current.available_cents)}
              </span>
              <div
                className="h-3 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-label="Gastado del total aportado"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(spentPct)}
              >
                <div className="h-3 rounded-full bg-prio-pronto transition-[width]" style={{ width: `${spentPct}%` }} />
              </div>
              <div className="flex justify-between text-[12px] font-semibold text-on-hero">
                <span>Gastado {fmtMXN(current.spent_cents)}</span>
                <span>Aportado {fmtMXN(current.added_cents)}</span>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('restar')}
                className="flex h-[68px] items-center justify-center gap-2.5 rounded-[20px] bg-gasto-tint text-[18px] font-extrabold text-gasto"
              >
                <Icon name="minus" size={26} stroke={2.8} /> Gasté
              </button>
              <button
                type="button"
                onClick={() => setMode('sumar')}
                className="flex h-[68px] items-center justify-center gap-2.5 rounded-[20px] bg-abono-tint text-[18px] font-extrabold text-abono"
              >
                <Icon name="plus" size={26} stroke={2.8} /> Agregué
              </button>
            </div>
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="m-0 mt-1 text-[18px] font-extrabold md:mt-0">Movimientos</h2>
            {movs.length === 0 ? (
              <EmptyCard>Sin movimientos todavía.</EmptyCard>
            ) : (
              <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[20px] border border-line bg-card p-0">
                {movs.map((m, i) => (
                  <MovementRow
                    key={m.id}
                    m={m}
                    last={i === movs.length - 1}
                    who={memberById(m.created_by)}
                    onDelete={() => remove(m)}
                  />
                ))}
              </ul>
            )}
            {movs.length > 0 && (
              <p className="m-0 text-center text-[12px] font-medium text-muted">
                Desliza a la izquierda para eliminar.
              </p>
            )}
          </section>
        </div>
      )}

      <AmountSheet
        mode={mode}
        budgetName={current?.name ?? ''}
        onClose={() => setMode(null)}
        onConfirm={({ cents, concept }) => {
          if (!current) return;
          haptic();
          add.mutate({
            id: newId(),
            budget_id: current.budget_id,
            amount_cents: mode === 'restar' ? -cents : cents,
            concept: concept ?? (mode === 'restar' ? 'Gasto' : 'Abono'),
          });
          setMode(null);
        }}
      />
      <NewBudgetSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setSelected(id);
          setCreating(false);
        }}
      />
    </main>
  );
}

function MovementRow({
  m,
  last,
  who,
  onDelete,
}: {
  m: Movement;
  last: boolean;
  who: ReturnType<ReturnType<typeof useApp>['memberById']>;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const horizontal = useRef(false);
  const neg = m.amount_cents < 0;

  return (
    <li className="relative" onKeyDown={(e) => (e.key === 'Delete' || e.key === 'Backspace') && onDelete()}>
      <div className="absolute inset-0 flex items-center justify-end bg-danger pr-5 text-white" aria-hidden="true">
        <Icon name="trash" size={20} />
      </div>
      <div
        tabIndex={0}
        aria-label={`${m.concept ?? 'Movimiento'} ${fmtMXN(m.amount_cents, 'always')}. Suprimir para eliminar.`}
        className={`relative flex touch-pan-y items-center gap-3 bg-card px-3.5 py-3 ${last ? '' : 'border-b border-line-soft'}`}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform .2s' }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          horizontal.current = false;
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const ddx = e.clientX - start.current.x;
          const ddy = e.clientY - start.current.y;
          if (!horizontal.current && Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) {
            horizontal.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
          if (horizontal.current) {
            setDragging(true);
            setDx(Math.min(0, ddx));
          }
        }}
        onPointerUp={() => {
          const go = dx < -90;
          start.current = null;
          setDragging(false);
          setDx(0);
          if (go) onDelete();
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <Avatar member={who} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{m.concept ?? (neg ? 'Gasto' : 'Abono')}</span>
          <span className="text-[12px] font-medium text-muted">{fmtRelative(new Date(m.created_at))}</span>
        </span>
        <span className={`text-[16px] font-extrabold ${neg ? 'text-gasto' : 'text-abono'}`}>
          {fmtMXN(m.amount_cents, 'always')}
        </span>
      </div>
    </li>
  );
}

interface NewBudgetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

function NewBudgetSheet(props: NewBudgetProps) {
  return props.open ? <NewBudgetForm {...props} /> : null;
}

function NewBudgetForm({ open, onClose, onCreated }: NewBudgetProps) {
  const { hid } = useApp();
  const create = useCreateBudget(hid);
  const [name, setName] = useState('');
  const [initial, setInitial] = useState('');
  const cents = parsePesos(initial);
  const valid = name.trim().length > 0 && (initial === '' || cents != null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nueva bolsa"
      footer={
        <PrimaryButton
          disabled={!valid || create.isPending}
          onClick={async () => {
            const id = await create.mutateAsync({ name: name.trim(), initialCents: cents ?? 0 });
            onCreated(id);
          }}
        >
          {create.isPending ? 'Creando…' : 'Crear bolsa'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre">
          <input
            className={inputCls}
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bebé, Arreglos casa…"
          />
        </Field>
        <Field label="Monto inicial (opcional)">
          <input
            className={inputCls}
            inputMode="decimal"
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            placeholder="$0"
          />
        </Field>
        {create.error && <p className="m-0 text-[13px] font-semibold text-gasto">No se pudo crear la bolsa.</p>}
      </div>
    </Sheet>
  );
}
