import { useState, type FormEvent } from 'react';
import { useApp } from '../../app/context';
import { newId, useCreateList, useDeleteList, useLists, useUpdateList, type List } from '../../data/lists';
import { useItems } from '../../data/items';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, inputCls, useToast } from '../../ui/kit';
import { listNameError } from './select';
import { useSelectedList } from './selectedList';

/** `target`: 'new' para crear, una lista para editarla, null cerrado. */
export function ListSheet({ target, onClose }: { target: 'new' | List | null; onClose: () => void }) {
  if (!target) return null;
  return target === 'new' ? (
    <CreateForm onClose={onClose} />
  ) : (
    <EditForm key={target.id} list={target} onClose={onClose} />
  );
}

function CreateForm({ onClose }: { onClose: () => void }) {
  const { hid, userId } = useApp();
  const lists = useLists(hid);
  const create = useCreateList(hid, userId);
  const update = useUpdateList(hid);
  const [, select] = useSelectedList(hid);
  const toast = useToast();
  const [name, setName] = useState('');
  const all = lists.data ?? [];
  const err = name.trim() ? listNameError(name, all) : null;
  const archived = all.filter((l) => l.archived_at);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || err) return;
    const id = newId();
    create.mutate({ id, name: name.trim() }, { onError: () => toast({ text: 'No se pudo crear la lista' }) });
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
    <Sheet open onClose={onClose} title="Nueva lista">
      <form onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <Field label="Nombre" hint={err ?? 'Por ejemplo: Posada, Mandado, Fiesta fin de año'}>
          <input
            className={inputCls}
            value={name}
            maxLength={40}
            placeholder="Posada"
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
  const [, select] = useSelectedList(hid);
  const toast = useToast();
  const [name, setName] = useState(list.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const err = name.trim() ? listNameError(name, lists.data ?? [], list.id) : null;
  const valid = name.trim().length > 0 && !err;
  const count = (items.data ?? []).filter((i) => i.list_id === list.id).length;

  const save = () => {
    if (!valid) return;
    if (name.trim() !== list.name) update.mutate({ id: list.id, patch: { name: name.trim() } });
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
        <PrimaryButton disabled={!valid} onClick={save}>
          Guardar
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
