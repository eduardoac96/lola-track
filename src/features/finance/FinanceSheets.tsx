import { useId, useState } from 'react';
import { useApp } from '../../app/context';
import {
  newId,
  useDeleteAccount,
  useDeleteFinItem,
  useSaveAccount,
  useSaveFinItem,
  type FinAccount,
  type FinItem,
  type FinKind,
} from '../../data/finance';
import { centsToInput, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Field, GhostButton, PrimaryButton, Segmented, inputCls } from '../../ui/kit';
import type { PayDay } from './period';

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
  const [grp, setGrp] = useState(existing?.grp ?? ('grp' in draft ? draft.grp : '15'));
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
            <input
              className={inputCls}
              maxLength={40}
              list={listId}
              value={grp}
              onChange={(e) => setGrp(e.target.value)}
              placeholder="Aguinaldo (dic)"
            />
            <datalist id={listId}>
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>
        )}
      </div>
    </Sheet>
  );
}

export function AccountSheet({ account, onClose }: { account: FinAccount | 'new' | null; onClose: () => void }) {
  return account ? (
    <AccountForm key={account === 'new' ? 'new' : account.id} account={account} onClose={onClose} />
  ) : null;
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
