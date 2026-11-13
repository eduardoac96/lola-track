import { useRef, useState } from 'react';
import { useApp } from '../../app/context';
import { useUpdateItem, type Item, type ItemPriority, type ItemType } from '../../data/items';
import { useLists } from '../../data/lists';
import { removePhoto, uploadItemPhoto, usePhotoUrl } from '../../data/photos';
import { centsToInput, parsePesos } from '../../lib/money';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, Segmented, inputCls } from '../../ui/kit';
import { PRIORITIES, SELECTABLE_TYPES, TYPES, isDone } from './select';
import { useDeleteWithUndo } from './useDeleteWithUndo';

interface Draft {
  title: string;
  type: ItemType;
  priority: ItemPriority;
  area: string;
  est: string;
  actual: string;
  due: string;
  link: string;
  notes: string;
  list: string; // '' = General
}

const toDraft = (i: Item): Draft => ({
  title: i.title,
  type: i.type === 'compra' ? 'compra' : 'tarea',
  priority: i.priority,
  area: i.area ?? '',
  est: centsToInput(i.price_estimated_cents),
  actual: centsToInput(i.price_actual_cents),
  due: i.due_date ?? '',
  link: i.link_url ?? '',
  notes: i.notes ?? '',
  list: i.list_id ?? '',
});

export function ItemSheet({ item, onClose }: { item: Item | null; onClose: () => void }) {
  return item ? <ItemForm key={item.id} item={item} onClose={onClose} /> : null;
}

function ItemForm({ item, onClose }: { item: Item; onClose: () => void }) {
  const { hid, memberById } = useApp();
  const update = useUpdateItem(hid);
  const lists = useLists(hid);
  const activeLists = (lists.data ?? []).filter((l) => !l.archived_at || l.id === item.list_id);
  const removeWithUndo = useDeleteWithUndo();
  const [d, setD] = useState<Draft>(() => toDraft(item));
  const [more, setMore] = useState(Boolean(item.link_url || item.notes || item.due_date));
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = usePhotoUrl(item?.photo_path);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });

  const estCents = parsePesos(d.est);
  const actCents = parsePesos(d.actual);
  const linkOk = !d.link || /^https?:\/\//i.test(d.link.trim());
  const valid =
    d.title.trim().length > 0 && (d.est === '' || estCents != null) && (d.actual === '' || actCents != null) && linkOk;

  const save = () => {
    update.mutate({
      id: item.id,
      patch: {
        title: d.title.trim(),
        type: d.type,
        priority: d.priority,
        area: d.area.trim() || null,
        price_estimated_cents: estCents,
        price_actual_cents: isDone(item) ? actCents : item.price_actual_cents,
        due_date: d.due || null,
        link_url: d.link.trim() || null,
        notes: d.notes.trim() || null,
        list_id: d.list || null,
      },
    });
    onClose();
  };

  const remove = () => {
    removeWithUndo(item);
    onClose();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const old = item.photo_path;
      const path = await uploadItemPhoto(hid, item.id, file);
      await update.mutateAsync({ id: item.id, patch: { photo_path: path } });
      if (old) await removePhoto(old);
    } catch {
      setPhotoError('No se pudo subir la foto.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const clearPhoto = async () => {
    const old = item.photo_path;
    if (!old) return;
    await update.mutateAsync({ id: item.id, patch: { photo_path: null } });
    await removePhoto(old);
  };

  const creator = memberById(item.created_by);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Pendiente"
      footer={
        <PrimaryButton disabled={!valid} onClick={save}>
          Guardar
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Qué">
          <input className={inputCls} value={d.title} maxLength={200} onChange={(e) => set('title', e.target.value)} />
        </Field>
        {activeLists.length > 0 && (
          <Field label="Lista">
            <select className={inputCls} value={d.list} onChange={(e) => set('list', e.target.value)}>
              <option value="">General</option>
              {activeLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Segmented
          label="Tipo"
          size="sm"
          value={d.type}
          onChange={(v) => set('type', v)}
          options={SELECTABLE_TYPES.map((k) => ({ value: k, label: TYPES[k].label }))}
        />
        <Segmented
          label="Prioridad"
          size="sm"
          value={d.priority}
          onChange={(v) => set('priority', v)}
          options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área">
            <input
              className={inputCls}
              value={d.area}
              maxLength={40}
              placeholder="Cuarto niños"
              onChange={(e) => set('area', e.target.value)}
            />
          </Field>
          <Field label="Precio estimado">
            <input
              className={inputCls}
              inputMode="decimal"
              value={d.est}
              placeholder="$0"
              onChange={(e) => set('est', e.target.value)}
              aria-invalid={d.est !== '' && estCents == null}
            />
          </Field>
        </div>
        {isDone(item) && (
          <Field label="Precio real">
            <input
              className={inputCls}
              inputMode="decimal"
              value={d.actual}
              placeholder="$0"
              onChange={(e) => set('actual', e.target.value)}
            />
          </Field>
        )}

        {/* Foto */}
        <div className="flex items-center gap-3">
          {photo.data ? (
            <img src={photo.data} alt={`Foto de ${item.title}`} className="size-24 rounded-[16px] object-cover" />
          ) : (
            <span
              className="flex size-24 items-center justify-center rounded-[16px]"
              style={{ background: TYPES[d.type].tint, color: TYPES[d.type].fg }}
            >
              <Icon name={TYPES[d.type].icon} size={32} />
            </span>
          )}
          <div className="flex flex-1 flex-col gap-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id={`photo-${item.id}`}
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            <label
              htmlFor={`photo-${item.id}`}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-[12px] px-2 text-[15px] font-bold text-primary-hover"
            >
              <Icon name="camera" size={20} />{' '}
              {uploading ? 'Subiendo…' : item.photo_path ? 'Cambiar foto' : 'Agregar foto'}
            </label>
            {item.photo_path && !uploading && (
              <button
                type="button"
                onClick={clearPhoto}
                className="h-10 px-2 text-left text-[14px] font-bold text-muted"
              >
                Quitar foto
              </button>
            )}
            {photoError && <span className="px-2 text-[13px] font-semibold text-gasto">{photoError}</span>}
          </div>
        </div>

        {!more ? (
          <button
            type="button"
            className="h-11 self-start text-[14px] font-bold text-primary-hover"
            onClick={() => setMore(true)}
          >
            Más detalles
          </button>
        ) : (
          <>
            <Field label="Para cuándo">
              <input className={inputCls} type="date" value={d.due} onChange={(e) => set('due', e.target.value)} />
            </Field>
            <Field label="Link (tienda, referencia)">
              <input
                className={inputCls}
                type="url"
                inputMode="url"
                value={d.link}
                placeholder="https://…"
                onChange={(e) => set('link', e.target.value)}
                aria-invalid={!linkOk}
              />
            </Field>
            {item.link_url && (
              <a
                href={item.link_url}
                target="_blank"
                rel="noreferrer"
                className="-mt-2 inline-flex h-10 items-center gap-1.5 text-[14px] font-bold"
              >
                <Icon name="link" size={16} /> Abrir link
              </a>
            )}
            <Field label="Notas">
              <textarea
                className={`${inputCls} h-24 py-3`}
                maxLength={2000}
                value={d.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>
          </>
        )}

        <p className="m-0 text-[12px] font-medium text-muted">
          Agregado por {creator?.display_name ?? '—'}
          {isDone(item) && ` · hecho por ${memberById(item.done_by)?.display_name ?? '—'}`}
        </p>
        <GhostButton danger onClick={remove}>
          <Icon name="trash" size={18} /> Eliminar pendiente
        </GhostButton>
      </div>
    </Sheet>
  );
}
