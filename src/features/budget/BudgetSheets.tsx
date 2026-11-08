import { useState } from 'react';
import { useApp } from '../../app/context';
import {
  useDeleteBudget,
  useMovements,
  useRenameBudget,
  useUpdateMovement,
  type Balance,
  type Movement,
} from '../../data/budgets';
import { centsToInput, fmtMXN, parsePesos } from '../../lib/money';
import { fmtRelative } from '../../lib/dates';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, Segmented, inputCls, useToast } from '../../ui/kit';

/* ───────── Editar / eliminar bolsa */
export function BudgetEditSheet({ budget, onClose }: { budget: Balance | null; onClose: () => void }) {
  return budget ? <BudgetEditForm key={budget.budget_id} budget={budget} onClose={onClose} /> : null;
}

function BudgetEditForm({ budget, onClose }: { budget: Balance; onClose: () => void }) {
  const { hid } = useApp();
  const rename = useRenameBudget(hid);
  const del = useDeleteBudget(hid);
  const movements = useMovements(hid);
  const toast = useToast();
  const [name, setName] = useState(budget.name);
  const [confirming, setConfirming] = useState(false);
  const count = (movements.data ?? []).filter((m) => m.budget_id === budget.budget_id).length;
  const valid = name.trim().length > 0 && name.trim().length <= 40;

  if (confirming) {
    return (
      <Sheet
        open
        onClose={onClose}
        title={`¿Eliminar "${budget.name}"?`}
        footer={
          <div className="flex flex-col gap-1">
            <PrimaryButton
              tone="gasto"
              onClick={() => {
                del.mutate(budget.budget_id);
                toast({ text: `Bolsa "${budget.name}" eliminada` });
                onClose();
              }}
            >
              Eliminar definitivamente
            </PrimaryButton>
            <GhostButton onClick={() => setConfirming(false)}>Cancelar</GhostButton>
          </div>
        }
      >
        <p className="m-0 text-[15px] font-medium">
          Se borrarán la bolsa y {count === 1 ? 'su movimiento' : `sus ${count} movimientos`} (saldo actual{' '}
          {fmtMXN(budget.available_cents)}). <b>No se puede deshacer.</b>
        </p>
        <p className="m-0 mt-3 text-[13px] font-medium text-muted">
          Los pendientes que restaron de esta bolsa se quedan como hechos, sin vínculo al presupuesto.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Editar bolsa"
      footer={
        <PrimaryButton
          disabled={!valid || name.trim() === budget.name}
          onClick={() => {
            rename.mutate({ id: budget.budget_id, name: name.trim() });
            onClose();
          }}
        >
          Guardar
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre">
          <input className={inputCls} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <p className="m-0 text-[13px] font-medium text-muted">
          Para corregir montos, toca un movimiento de la lista y edítalo.
        </p>
        <GhostButton danger onClick={() => setConfirming(true)}>
          <Icon name="trash" size={18} /> Eliminar bolsa
        </GhostButton>
      </div>
    </Sheet>
  );
}

/* ───────── Editar movimiento */
export function MovementSheet({
  movement,
  onClose,
  onDelete,
}: {
  movement: Movement | null;
  onClose: () => void;
  onDelete: (m: Movement) => void;
}) {
  return movement ? <MovementForm key={movement.id} movement={movement} onClose={onClose} onDelete={onDelete} /> : null;
}

function MovementForm({
  movement,
  onClose,
  onDelete,
}: {
  movement: Movement;
  onClose: () => void;
  onDelete: (m: Movement) => void;
}) {
  const { hid, memberById } = useApp();
  const update = useUpdateMovement(hid);
  const [kind, setKind] = useState<'gasto' | 'abono'>(movement.amount_cents < 0 ? 'gasto' : 'abono');
  const [amount, setAmount] = useState(centsToInput(Math.abs(movement.amount_cents)));
  const [concept, setConcept] = useState(movement.concept ?? '');
  const cents = parsePesos(amount);
  const valid = cents != null && cents > 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Editar movimiento"
      footer={
        <PrimaryButton
          tone={kind === 'gasto' ? 'gasto' : 'abono'}
          disabled={!valid}
          onClick={() => {
            update.mutate({
              id: movement.id,
              amount_cents: kind === 'gasto' ? -(cents as number) : (cents as number),
              concept: concept.trim() || null,
            });
            onClose();
          }}
        >
          Guardar {valid ? fmtMXN(kind === 'gasto' ? -(cents as number) : (cents as number), 'always') : ''}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Tipo de movimiento"
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'gasto', label: 'Gasto (−)' },
            { value: 'abono', label: 'Abono (+)' },
          ]}
        />
        <Field label="Monto">
          <input
            className={`${inputCls} h-14 text-[22px]`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$0"
            aria-invalid={amount !== '' && !valid}
          />
        </Field>
        <Field label="Concepto">
          <input className={inputCls} maxLength={80} value={concept} onChange={(e) => setConcept(e.target.value)} />
        </Field>
        <p className="m-0 text-[12px] font-medium text-muted">
          Registrado por {memberById(movement.created_by)?.display_name ?? '—'} ·{' '}
          {fmtRelative(new Date(movement.created_at))}
          {movement.item_id ? ' · viene de un pendiente comprado' : ''}
        </p>
        <GhostButton
          danger
          onClick={() => {
            onDelete(movement);
            onClose();
          }}
        >
          <Icon name="trash" size={18} /> Eliminar movimiento
        </GhostButton>
      </div>
    </Sheet>
  );
}
