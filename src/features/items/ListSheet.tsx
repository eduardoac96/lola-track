import { useState, type FormEvent } from 'react';
import { useApp } from '../../app/context';
import {
  newId,
  useCreateList,
  useDeleteList,
  useDuplicateList,
  useLists,
  useUpdateList,
  type List,
} from '../../data/lists';
import { useItems } from '../../data/items';
import { useBalances, useCreateBudget } from '../../data/budgets';
import { fmtMXN, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, SwitchRow, inputCls, useToast } from '../../ui/kit';
import { nextYearName } from './gifts';
import { listNameError } from './select';
import { useSelectedList } from './selectedList';

const NEW_BUDGET = '__new';

/** `target`: 'new' para crear, una lista para editarla, null cerrado. */
export function ListSheet({
  target,
  onClose,
  gift = false,
}: {
  target: 'new' | List | null;
  onClose: () => void;
  /** Crear en Regalos: la lista nace en modo regalos. */
  gift?: boolean;
}) {
  if (!target) return null;
  return target === 'new' ? (
    <CreateForm onClose={onClose} gift={gift} />
  ) : (
    <EditForm key={target.id} list={target} onClose={onClose} />
  );
}

function CreateForm({ onClose, gift }: { onClose: () => void; gift: boolean }) {
  const { hid, userId } = useApp();
  const lists = useLists(hid);
  const create = useCreateList(hid, userId);
  const update = useUpdateList(hid);
  const [, select] = useSelectedList(hid, gift ? 'gift' : 'list');
  const toast = useToast();
  const [name, setName] = useState('');
  const all = lists.data ?? [];
  const err = name.trim() ? listNameError(name, all) : null;
  const archived = all.filter((l) => l.archived_at && l.is_gift === gift);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || err) return;
    const id = newId();
    create.mutate(
      { id, name: name.trim(), is_gift: gift },
      { onError: () => toast({ text: 'No se pudo crear la lista' }) },
    );
    select(id);
    onClose();
  };

  const restore = (l: List) => {
    if (listNameError(l.name, all, l.id)) {
      toast({ text: `Ya hay una lista "${l.name}" activa` });
      return;
    }
    update.mutate({ id: l.id, patch: { archived_at: null } });
    select(l.id);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={gift ? 'Nueva lista de regalos' : 'Nueva lista'}>
      <form onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <Field
          label="Nombre"
          hint={
            err ??
            (gift ? 'Por ejemplo: Navidad 2026, Cumpleaños de Mamá' : 'Por ejemplo: Posada, Mandado, Fiesta fin de año')
          }
        >
          <input
            className={inputCls}
            value={name}
            maxLength={40}
            placeholder={gift ? 'Navidad 2026' : 'Posada'}
            autoComplete="off"
            enterKeyHint="done"
            data-autofocus=""
            onChange={(e) => setName(e.target.value)}
            aria-invalid={err != null}
          />
        </Field>
        <PrimaryButton type="submit" disabled={!name.trim() || err != null}>
          Crear lista
        </PrimaryButton>

        {archived.length > 0 && (
          <section className="flex flex-col gap-1 pt-2">
            <h3 className="m-0 text-[13px] font-bold text-muted">Archivadas</h3>
            {archived.map((l) => (
              <div key={l.id} className="flex h-12 items-center justify-between gap-2">
                <span className="truncate text-[15px] font-bold">{l.name}</span>
                <button
                  type="button"
                  onClick={() => restore(l)}
                  className="h-11 shrink-0 px-2 text-[14px] font-bold text-primary-hover"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </section>
        )}
      </form>
    </Sheet>
  );
}

function EditForm({ list, onClose }: { list: List; onClose: () => void }) {
  const { hid } = useApp();
  const lists = useLists(hid);
  const items = useItems(hid);
  const update = useUpdateList(hid);
  const del = useDeleteList(hid);
  const [, select] = useSelectedList(hid, list.is_gift ? 'gift' : 'list');
  const toast = useToast();
  const balances = useBalances(hid);
  const createBudget = useCreateBudget(hid);
  const duplicate = useDuplicateList(hid);
  const [name, setName] = useState(list.name);
  const [budget, setBudget] = useState<string>(list.budget_id ?? '');
  const [newTotal, setNewTotal] = useState('');
  const [isGift, setIsGift] = useState(list.is_gift);
  const [eventDate, setEventDate] = useState(list.event_date ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const err = name.trim() ? listNameError(name, lists.data ?? [], list.id) : null;
  const totalCents = parsePesos(newTotal);
  const creatingBudget = budget === NEW_BUDGET;
  const valid = name.trim().length > 0 && !err && (!creatingBudget || (totalCents ?? 0) > 0);
  const count = (items.data ?? []).filter((i) => i.list_id === list.id).length;
  const bags = balances.data ?? [];

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      let budgetId: string | null = budget || null;
      if (creatingBudget) {
        budgetId = await createBudget.mutateAsync({ name: name.trim(), initialCents: totalCents ?? 0 });
      }
      const patch = {
        name: name.trim(),
        budget_id: budgetId,
        is_gift: isGift,
        event_date: isGift && eventDate ? eventDate : null,
      };
      const changed =
        patch.name !== list.name ||
        patch.budget_id !== list.budget_id ||
        patch.is_gift !== list.is_gift ||
        patch.event_date !== list.event_date;
      if (changed) update.mutate({ id: list.id, patch });
      onClose();
    } catch {
      toast({ text: 'No se pudo crear la bolsa' });
    } finally {
      setSaving(false);
    }
  };

  const dup = () => {
    const all = lists.data ?? [];
    let next = nextYearName(list.name);
    if (listNameError(next, all)) next = `${next} (copia)`.slice(0, 40);
    if (listNameError(next, all)) {
      toast({ text: 'Ya existe una lista con ese nombre' });
      return;
    }
    duplicate.mutate(
      { id: list.id, name: next },
      {
        onSuccess: (id) => {
          select(id);
          toast({ text: `Lista "${next}" lista, con las mismas personas y topes` });
        },
        onError: () => toast({ text: 'No se pudo duplicar la lista' }),
      },
    );
    onClose();
  };

  const archive = () => {
    update.mutate({ id: list.id, patch: { archived_at: new Date().toISOString() } });
    select('all');
    toast({
      text: `"${list.name}" archivada`,
      action: {
        label: 'Deshacer',
        run: () => {
          update.mutate({ id: list.id, patch: { archived_at: null } });
          select(list.id);
        },
      },
    });
    onClose();
  };

  const remove = () => {
    del.mutate(list.id);
    select('all');
    toast({ text: `Lista "${list.name}" eliminada` });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Lista"
      footer={
        <PrimaryButton disabled={!valid || saving} onClick={save}>
          {saving ? 'Guardando…' : 'Guardar'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nombre" hint={err ?? undefined}>
          <input
            className={inputCls}
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={err != null}
          />
        </Field>

        <Field label="Presupuesto" hint="Las compras de esta lista se descuentan de la bolsa al marcarlas hechas.">
          <select className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">Sin presupuesto</option>
            {bags.map((b) => (
              <option key={b.budget_id} value={b.budget_id}>
                {b.name} · {fmtMXN(b.available_cents)} disponibles
              </option>
            ))}
            <option value={NEW_BUDGET}>+ Nueva bolsa "{name.trim() || list.name}"</option>
          </select>
        </Field>
        {creatingBudget && (
          <Field label="Total para la lista">
            <input
              className={`${inputCls} h-14 text-[22px]`}
              inputMode="decimal"
              value={newTotal}
              placeholder="$8,000"
              onChange={(e) => setNewTotal(e.target.value)}
              aria-invalid={newTotal !== '' && totalCents == null}
              data-autofocus=""
            />
          </Field>
        )}

        <SwitchRow
          on={isGift}
          onChange={setIsGift}
          title="Lista de regalos"
          hint={
            isGift === list.is_gift
              ? 'Para quién, topes por persona y Comprado → Envuelto → Entregado'
              : isGift
                ? 'Se mueve a la pestaña Regalos'
                : 'Se mueve a Pendientes'
          }
        />
        {isGift && (
          <Field label="Fecha del evento" hint="Te avisamos 7 días antes si quedan regalos sin comprar.">
            <input className={inputCls} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
        )}
        {list.is_gift && (
          <GhostButton onClick={dup}>
            <Icon name="gift" size={18} /> Duplicar para {nextYearName(list.name)}
          </GhostButton>
        )}

        <div className="flex flex-col gap-1">
          <GhostButton onClick={archive}>
            <Icon name="check" size={18} /> Terminar y archivar
          </GhostButton>
          <p className="m-0 px-2 text-center text-[12px] font-medium text-muted">
            Se oculta con sus pendientes y deja de mandar avisos. La restauras desde "Nueva lista".
          </p>
        </div>

        {!confirmDelete ? (
          <GhostButton danger onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" size={18} /> Eliminar lista
          </GhostButton>
        ) : (
          <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-bg p-4">
            <p className="m-0 text-[14px] font-semibold">
              {count > 0
                ? `Sus ${count} pendiente${count === 1 ? '' : 's'} pasan a General. ¿Eliminar "${list.name}"?`
                : `¿Eliminar "${list.name}"?`}
            </p>
            <PrimaryButton tone="gasto" onClick={remove}>
              Eliminar lista
            </PrimaryButton>
            <GhostButton onClick={() => setConfirmDelete(false)}>Cancelar</GhostButton>
          </div>
        )}
      </div>
    </Sheet>
  );
}
