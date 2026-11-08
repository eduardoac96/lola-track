import { useState } from 'react';
import { useApp } from '../../app/context';
import { useDeleteEvent, useSaveEvent, type CalEvent } from '../../data/events';
import { newId } from '../../data/cache';
import { useItems } from '../../data/items';
import { dayKey, fromLocal, timeKey } from '../../lib/dates';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Field, GhostButton, PrimaryButton, inputCls, useToast } from '../../ui/kit';
import { isDone } from '../items/select';
import { DURATION_OPTIONS, REMIND_OPTIONS, durationMinutes } from './select';

export type EventTarget = { kind: 'new'; day: Date } | { kind: 'edit'; event: CalEvent } | null;

export function EventSheet({ target, onClose }: { target: EventTarget; onClose: () => void }) {
  if (!target) return null;
  const key = target.kind === 'new' ? `new-${dayKey(target.day)}` : target.event.id;
  return <EventForm key={key} target={target} onClose={onClose} />;
}

function EventForm({ target, onClose }: { target: NonNullable<EventTarget>; onClose: () => void }) {
  const { hid, userId } = useApp();
  const save = useSaveEvent(hid, userId);
  const del = useDeleteEvent(hid);
  const items = useItems(hid);
  const toast = useToast();
  const e0 = target.kind === 'edit' ? target.event : null;
  const s0 = e0 ? new Date(e0.starts_at) : null;

  const [title, setTitle] = useState(e0?.title ?? '');
  const [date, setDate] = useState(target.kind === 'new' ? dayKey(target.day) : dayKey(s0 as Date));
  const [time, setTime] = useState(s0 ? timeKey(s0) : '10:00');
  const [duration, setDuration] = useState<number | null>(e0 ? durationMinutes(e0) : null);
  const [place, setPlace] = useState(e0?.place ?? '');
  const [remind, setRemind] = useState<number | null>(e0 ? e0.remind_minutes : 60);
  const [itemId, setItemId] = useState<string>(e0?.item_id ?? '');
  const [notes, setNotes] = useState(e0?.notes ?? '');

  const isNew = target.kind === 'new';
  const valid = title.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);
  const linkable = (items.data ?? []).filter((i) => !isDone(i) || i.id === itemId);

  const submit = () => {
    const start = fromLocal(date, time);
    save.mutate({
      id: isNew ? newId() : target.event.id,
      isNew,
      values: {
        title: title.trim(),
        starts_at: start.toISOString(),
        ends_at: duration ? new Date(start.getTime() + duration * 60_000).toISOString() : null,
        place: place.trim() || null,
        remind_minutes: remind,
        item_id: itemId || null,
        notes: notes.trim() || null,
      },
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'Nuevo evento' : 'Evento'}
      footer={
        <PrimaryButton disabled={!valid} onClick={submit}>
          {isNew ? 'Agregar a la agenda' : 'Guardar'}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Qué">
          <input
            className={inputCls}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Visita del plomero"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día">
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <input className={inputCls} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duración">
            <select
              className={inputCls}
              value={duration ?? ''}
              onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aviso">
            <select
              className={inputCls}
              value={remind ?? ''}
              onChange={(e) => setRemind(e.target.value ? Number(e.target.value) : null)}
            >
              {REMIND_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Lugar (opcional)">
          <input
            className={inputCls}
            maxLength={120}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Casa"
          />
        </Field>
        {linkable.length > 0 && (
          <Field label="Pendiente relacionado (opcional)">
            <select className={inputCls} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Ninguno</option>
              {linkable.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Notas (opcional)">
          <textarea
            className={`${inputCls} h-20 py-3`}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {!isNew && (
          <GhostButton
            danger
            onClick={() => {
              del.mutate(target.event.id);
              toast({ text: 'Evento eliminado' });
              onClose();
            }}
          >
            <Icon name="trash" size={18} /> Eliminar evento
          </GhostButton>
        )}
      </div>
    </Sheet>
  );
}
