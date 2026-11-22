import { useState } from 'react';
import { useApp } from '../../app/context';
import type { Item } from '../../data/items';
import type { List } from '../../data/lists';
import { setLastBudget, useBalances } from '../../data/budgets';
import { useNavigate } from 'react-router';
import { useDeletePerson, useListPeople, useSavePerson } from '../../data/listPeople';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, inputCls } from '../../ui/kit';
import { listBudget, peopleSummary, personKey, type BarTone, type PersonRow } from './gifts';

const TONE: Record<BarTone, string> = { ok: 'var(--color-done)', warn: '#D69A2D', over: '#D2483A' };

/** Barra de la bolsa ligada a la lista: Gastado · Planeado · Libre. */
export function ListBudgetBar({ list, items }: { list: List; items: readonly Item[] }) {
  const { hid } = useApp();
  const balances = useBalances(hid);
  const navigate = useNavigate();
  const bal = balances.data?.find((b) => b.budget_id === list.budget_id);
  if (!bal) return null;
  const b = listBudget(bal, items);
  const pct = (v: number) => (b.total > 0 ? Math.min(100, (v / b.total) * 100) : 0);
  const spentPct = pct(b.spent);
  const plannedPct = Math.min(100 - spentPct, pct(b.planned));

  return (
    <section
      aria-label={`Presupuesto ${bal.name}`}
      className="flex flex-col gap-2.5 rounded-[var(--radius-card)] bg-hero px-4 py-3.5 text-white md:order-none"
    >
      <div className="flex items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setLastBudget(bal.budget_id);
            navigate('/presupuesto');
          }}
          aria-label={`Ver la bolsa ${bal.name} en Presupuesto`}
          className="-my-3 flex h-11 min-w-0 items-center gap-1 text-[13px] font-semibold text-on-hero"
        >
          <Icon name="wallet" size={14} />
          <span className="truncate">Bolsa {bal.name}</span>
          <Icon name="chevronRight" size={14} stroke={2.6} />
        </button>
        <span className="text-[13px] font-semibold text-on-hero">de {fmtMXN(b.total)}</span>
      </div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-white/20"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(b.ratio, 9.99) * 100)}
        aria-label="Usado del presupuesto"
      >
        <span style={{ width: `${spentPct}%`, background: TONE[b.tone] }} />
        <span style={{ width: `${plannedPct}%`, background: TONE[b.tone], opacity: 0.45 }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Gastado" value={fmtMXN(b.spent)} />
        <Stat label="Planeado" value={fmtMXN(b.planned)} />
        <Stat
          label={b.free < 0 ? 'Te pasas' : 'Libre'}
          value={fmtMXN(b.free, 'never')}
          strong
          color={b.tone === 'ok' ? undefined : TONE[b.tone]}
        />
      </div>
    </section>
  );
}

function Stat({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[11px] font-semibold text-on-hero">{label}</span>
      <span
        className={`truncate ${strong ? 'text-[18px] font-extrabold' : 'text-[15px] font-bold'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </span>
  );
}

/** Subtotal por persona con tope opcional. Tocar una persona edita su tope. */
export function GiftPeople({ list, items }: { list: List; items: readonly Item[] }) {
  const { hid } = useApp();
  const people = useListPeople(hid);
  const mine = (people.data ?? []).filter((p) => p.list_id === list.id);
  const { rows, unassigned } = peopleSummary(items, mine);
  const [editing, setEditing] = useState<PersonRow | 'new' | null>(null);

  return (
    <section aria-label="Por persona" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[13px] font-bold text-muted">Por persona</h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex h-11 items-center gap-1 px-1 text-[13px] font-bold text-primary-hover"
        >
          <Icon name="plus" size={16} stroke={2.6} /> Persona
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-[var(--radius-card)] border border-dashed border-line px-4 py-3 text-[13px] font-medium text-muted">
          Escribe <b>@Mamá</b> al agregar un regalo o agrega personas con tope.
        </p>
      ) : (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {rows.map((r) => (
            <button
              key={personKey(r.name)}
              type="button"
              onClick={() => setEditing(r)}
              aria-label={`${r.name}: ${fmtMXN(r.amount)}${r.cap != null ? ` de ${fmtMXN(r.cap)}` : ''}. Editar tope`}
              className={`flex min-h-14 shrink-0 flex-col justify-center rounded-[16px] border bg-card px-3.5 py-2 text-left ${
                r.over ? 'border-[#D2483A]' : 'border-line'
              }`}
            >
              <span className="max-w-[140px] truncate text-[14px] font-bold">{r.name}</span>
              <span className={`text-[12px] font-semibold ${r.over ? 'text-[#D2483A]' : 'text-muted'}`}>
                {fmtMXN(r.amount)}
                {r.cap != null && ` / ${fmtMXN(r.cap)}`} · {r.count}
              </span>
            </button>
          ))}
          {unassigned.count > 0 && (
            <span className="flex min-h-14 shrink-0 flex-col justify-center rounded-[16px] border border-dashed border-line px-3.5 py-2">
              <span className="text-[14px] font-bold text-muted">Sin asignar</span>
              <span className="text-[12px] font-semibold text-muted">
                {fmtMXN(unassigned.amount)} · {unassigned.count}
              </span>
            </span>
          )}
        </div>
      )}
      <PersonSheet
        key={editing === 'new' ? 'new' : (editing?.name ?? '')}
        target={editing}
        listId={list.id}
        taken={rows.map((r) => personKey(r.name))}
        onClose={() => setEditing(null)}
      />
    </section>
  );
}

function PersonSheet({
  target,
  listId,
  taken,
  onClose,
}: {
  target: PersonRow | 'new' | null;
  listId: string;
  taken: string[];
  onClose: () => void;
}) {
  const { hid } = useApp();
  const save = useSavePerson(hid);
  const del = useDeletePerson(hid);
  const isNew = target === 'new';
  const row = isNew ? null : target;
  const [name, setName] = useState(row?.name ?? '');
  const [cap, setCap] = useState(centsToInput(row?.cap));
  if (!target) return null;

  const capCents = parsePesos(cap);
  const dupe = isNew && taken.includes(personKey(name));
  const valid = name.trim().length > 0 && !dupe && (cap === '' || (capCents ?? 0) > 0);

  const submit = () => {
    if (!valid) return;
    save.mutate({ id: row?.personId ?? undefined, list_id: listId, name: name.trim(), cap_cents: capCents });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'Nueva persona' : row!.name}
      footer={
        <PrimaryButton disabled={!valid} onClick={submit}>
          Guardar
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        {isNew && (
          <Field label="Nombre" hint={dupe ? 'Ya está en la lista' : undefined}>
            <input
              className={inputCls}
              value={name}
              maxLength={40}
              placeholder="Mamá"
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
              data-autofocus=""
            />
          </Field>
        )}
        <Field label="Tope (opcional)" hint="Se marca en rojo si sus regalos lo rebasan.">
          <input
            className={`${inputCls} h-14 text-[22px]`}
            inputMode="decimal"
            value={cap}
            placeholder="$800"
            onChange={(e) => setCap(e.target.value)}
            aria-invalid={cap !== '' && !(capCents && capCents > 0)}
            data-autofocus={isNew ? undefined : ''}
          />
        </Field>
        {row?.personId && (
          <GhostButton
            danger
            onClick={() => {
              del.mutate(row.personId!);
              onClose();
            }}
          >
            <Icon name="trash" size={18} /> Quitar tope y persona
          </GhostButton>
        )}
      </div>
    </Sheet>
  );
}
