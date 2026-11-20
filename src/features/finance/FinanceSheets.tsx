import { useId, useState } from 'react';
import { useApp } from '../../app/context';
import {
  accountDelta,
  newId,
  useAccountMove,
  useDeleteAccount,
  useDeleteMovement,
  useFinAccounts,
  useDeleteFinItem,
  useSaveAccount,
  useSaveFinItem,
  type FinAccount,
  type FinItem,
  type FinKind,
  type FinMovement,
} from '../../data/finance';
import { dayKey } from '../../lib/dates';
import { Icon } from '../../ui/Icon';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Field, GhostButton, PrimaryButton, Segmented, haptic, inputCls, useToast } from '../../ui/kit';
import type { PayDay } from './period';

const NEW_GROUP = '__nuevo__';

/** Editar una línea existente o crear una nueva (quincena o extra). */
export type ItemDraft = { item: FinItem } | { section: 'quincena' | 'extra'; grp: string };

export function ItemEditSheet({
  draft,
  groups,
  onClose,
}: {
  draft: ItemDraft | null;
  groups: string[];
  onClose: () => void;
}) {
  // key: el formulario se reinicia al abrir otra línea
  return draft ? (
    <ItemForm key={'item' in draft ? draft.item.id : 'new'} draft={draft} groups={groups} onClose={onClose} />
  ) : null;
}

function ItemForm({ draft, groups, onClose }: { draft: ItemDraft; groups: string[]; onClose: () => void }) {
  const { hid, userId } = useApp();
  const save = useSaveFinItem(hid, userId);
  const del = useDeleteFinItem(hid, userId);
  const listId = useId();
  const existing = 'item' in draft ? draft.item : null;
  const section = existing?.section ?? ('section' in draft ? draft.section : 'quincena');
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(existing?.amount_cents));
  const [kind, setKind] = useState<FinKind>((existing?.kind as FinKind) ?? 'gasto');
  const accounts = useFinAccounts(hid, userId);
  const [accountId, setAccountId] = useState(existing?.account_id ?? '');
  const [more, setMore] = useState(!!existing?.account_id);
  const [grp, setGrp] = useState(existing?.grp ?? ('grp' in draft ? draft.grp : '15'));
  // Extras: dropdown con los grupos existentes; "Nuevo grupo…" abre un campo de texto.
  const initialGrp = existing?.grp ?? ('grp' in draft ? draft.grp : '');
  const groupOptions = initialGrp && !groups.includes(initialGrp) ? [initialGrp, ...groups] : groups;
  const [newGrp, setNewGrp] = useState(section === 'extra' && groupOptions.length === 0);
  const cents = parsePesos(amount);
  const valid = name.trim().length > 0 && cents != null && grp.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    save.mutate({
      id: existing?.id ?? newId(),
      isNew: !existing,
      section,
      grp: grp.trim(),
      name: name.trim(),
      amount_cents: cents,
      kind,
      account_id: accountId || null,
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'Editar' : section === 'quincena' ? 'Nueva línea' : 'Nuevo extra'}
      footer={
        <div className="flex flex-col gap-1">
          <PrimaryButton disabled={!valid} onClick={submit}>
            Guardar
          </PrimaryButton>
          {existing && (
            <GhostButton
              danger
              onClick={() => {
                del.mutate(existing.id);
                onClose();
              }}
            >
              Eliminar
            </GhostButton>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Concepto">
          <input className={inputCls} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Monto">
          <input
            className={inputCls}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$0"
          />
        </Field>
        <Segmented
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'gasto', label: 'Gasto' },
            { value: 'deuda', label: 'Deuda' },
            { value: 'ahorro', label: 'Ahorro' },
          ]}
        />
        {section === 'quincena' ? (
          <Segmented<PayDay>
            label="Día de pago"
            value={grp as PayDay}
            onChange={setGrp}
            options={[
              { value: '15', label: 'Día 15' },
              { value: '30', label: 'Día 30' },
            ]}
          />
        ) : (
          <Field label="Ingreso (grupo)">
            <select
              id={listId}
              className={inputCls}
              value={newGrp ? NEW_GROUP : grp}
              onChange={(e) => {
                if (e.target.value === NEW_GROUP) {
                  setNewGrp(true);
                  setGrp('');
                } else {
                  setNewGrp(false);
                  setGrp(e.target.value);
                }
              }}
            >
              {groupOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
              <option value={NEW_GROUP}>Nuevo grupo…</option>
            </select>
            {newGrp && (
              <input
                className={`${inputCls} mt-2`}
                aria-label="Nombre del nuevo grupo"
                maxLength={40}
                autoFocus
                value={grp}
                onChange={(e) => setGrp(e.target.value)}
                placeholder="Aguinaldo (dic)"
              />
            )}
          </Field>
        )}
        {!more ? (
          <button
            type="button"
            className="h-11 self-start text-[14px] font-bold text-primary-hover"
            onClick={() => setMore(true)}
          >
            Más detalles
          </button>
        ) : (
          <Field label="Abona a" hint="Al marcarla se abona sola a esa deuda o meta.">
            <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Ninguna</option>
              {(accounts.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Sheet>
  );
}

export function AccountSheet({
  account,
  movements,
  onClose,
}: {
  account: FinAccount | 'new' | null;
  movements: FinMovement[];
  onClose: () => void;
}) {
  if (!account) return null;
  if (account === 'new') return <AccountForm key="new" account="new" onClose={onClose} />;
  return <AccountDetail key={account.id} account={account} movements={movements} onClose={onClose} />;
}

const MOVE_LABELS = {
  deuda: { abono: 'Abonar', cargo: 'Aumentar' },
  meta: { abono: 'Depositar', cargo: 'Retirar' },
} as const;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtShort = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]}`;
};

/** Saldo con historial: abonar/cargar mueve el saldo vía RPC; borrar un movimiento lo revierte. */
function AccountDetail({
  account: initial,
  movements,
  onClose,
}: {
  account: FinAccount;
  movements: FinMovement[];
  onClose: () => void;
}) {
  const { hid, userId } = useApp();
  const accounts = useFinAccounts(hid, userId);
  const account = accounts.data?.find((a) => a.id === initial.id) ?? initial;
  const move = useAccountMove(hid, userId);
  const unmove = useDeleteMovement(hid, userId);
  const toast = useToast();
  const kind = account.kind === 'meta' ? 'meta' : 'deuda';
  const [mode, setMode] = useState<'abono' | 'cargo' | null>(null);
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(() => dayKey(new Date()));
  const [editing, setEditing] = useState(false);
  const cents = parsePesos(amount);
  const history = movements.filter((m) => m.account_id === account.id);
  const tooBig = mode != null && cents != null && account.balance_cents + accountDelta(kind, mode, cents) < 0;
  const valid = mode != null && cents != null && cents > 0 && !tooBig;
  const fail = (e: unknown) => toast({ text: e instanceof Error ? e.message : 'No se pudo guardar' });

  if (editing) return <AccountForm account={account} onClose={onClose} />;

  return (
    <Sheet
      open
      onClose={onClose}
      title={account.name}
      footer={
        mode ? (
          <PrimaryButton
            disabled={!valid}
            onClick={() => {
              if (!valid || cents == null) return;
              haptic();
              move.mutate(
                { id: newId(), account, direction: mode, amount_cents: cents, concept, occurred_on: date },
                { onError: fail },
              );
              setMode(null);
              setAmount('');
              setConcept('');
            }}
          >
            {MOVE_LABELS[kind][mode]}
          </PrimaryButton>
        ) : (
          <GhostButton onClick={() => setEditing(true)}>Editar nombre o meta</GhostButton>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-bold text-muted">{kind === 'meta' ? 'Llevas' : 'Debes'}</span>
          <span className="text-[36px] leading-none font-extrabold">{fmtMXN(account.balance_cents)}</span>
          {kind === 'meta' && account.target_cents && (
            <span className="text-[13px] font-semibold text-muted">de {fmtMXN(account.target_cents)}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['abono', 'cargo'] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={mode === d}
              onClick={() => setMode((p) => (p === d ? null : d))}
              className={`min-h-12 rounded-[14px] text-[15px] font-bold ${
                mode === d ? 'bg-hero text-white' : 'border border-line bg-card'
              }`}
            >
              {MOVE_LABELS[kind][d]}
            </button>
          ))}
        </div>
        {mode && (
          <>
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
            {tooBig && <span className="text-[13px] font-bold text-gasto">Es más que el saldo.</span>}
            <Field label="Nota (opcional)">
              <input className={inputCls} maxLength={80} value={concept} onChange={(e) => setConcept(e.target.value)} />
            </Field>
            <Field label="Fecha">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </>
        )}
        {history.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-bold text-muted">Historial</span>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] border border-line p-0">
              {history.map((m, n) => {
                const dir = m.direction === 'cargo' ? 'cargo' : 'abono';
                const delta = accountDelta(kind, dir, m.amount_cents);
                return (
                  <li
                    key={m.id}
                    className={`flex items-center gap-2 py-1 pl-3 ${n === history.length - 1 ? '' : 'border-b border-line-soft'}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-bold">{m.concept ?? MOVE_LABELS[kind][dir]}</span>
                      <span className="text-[12px] font-semibold text-muted">{fmtShort(m.occurred_on)}</span>
                    </span>
                    <span className="text-[14px] font-extrabold">
                      {delta < 0 ? '−' : '+'}
                      {fmtMXN(m.amount_cents)}
                    </span>
                    <button
                      type="button"
                      aria-label="Borrar movimiento"
                      onClick={() => unmove.mutate(m, { onError: fail })}
                      className="flex size-11 items-center justify-center text-muted"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function AccountForm({ account, onClose }: { account: FinAccount | 'new'; onClose: () => void }) {
  const { hid, userId } = useApp();
  const save = useSaveAccount(hid, userId);
  const del = useDeleteAccount(hid, userId);
  const existing = account === 'new' ? null : account;
  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<'deuda' | 'meta'>((existing?.kind as 'deuda' | 'meta') ?? 'deuda');
  const [balance, setBalance] = useState(centsToInput(existing?.balance_cents));
  const [target, setTarget] = useState(centsToInput(existing?.target_cents));
  const bal = parsePesos(balance);
  const tgt = parsePesos(target);
  const valid = name.trim().length > 0 && bal != null && (kind === 'deuda' || (tgt != null && tgt > 0));

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? existing.name : 'Nueva deuda o meta'}
      footer={
        <div className="flex flex-col gap-1">
          <PrimaryButton
            disabled={!valid}
            onClick={() => {
              save.mutate({
                id: existing?.id ?? newId(),
                isNew: !existing,
                name: name.trim(),
                kind,
                balance_cents: bal ?? 0,
                target_cents: kind === 'meta' ? tgt : null,
              });
              onClose();
            }}
          >
            Guardar
          </PrimaryButton>
          {existing && (
            <GhostButton
              danger
              onClick={() => {
                del.mutate(existing.id);
                onClose();
              }}
            >
              Eliminar
            </GhostButton>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre">
          <input className={inputCls} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {!existing && (
          <Segmented
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'deuda', label: 'Deuda' },
              { value: 'meta', label: 'Meta de ahorro' },
            ]}
          />
        )}
        <Field label={kind === 'meta' ? 'Llevas' : 'Saldo que debes hoy'}>
          <input
            className={inputCls}
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </Field>
        {kind === 'meta' && (
          <Field label="Meta">
            <input
              className={inputCls}
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
        )}
      </div>
    </Sheet>
  );
}
