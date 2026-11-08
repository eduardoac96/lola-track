import { useState } from 'react';
import { useApp } from '../../app/context';
import { friendlyError, useSwitchHousehold } from '../../data/household';
import { useItems } from '../../data/items';
import { useEvents } from '../../data/events';
import { useMovements } from '../../data/budgets';
import { GhostButton, PrimaryButton, inputCls } from '../../ui/kit';

/**
 * Para quien creó un hogar propio por error y quiere entrar al de su pareja.
 * Solo se muestra si es el único miembro de su hogar actual.
 */
export function JoinOtherHousehold() {
  const { hid, userId, members } = useApp();
  const me = members.find((m) => m.user_id === userId);
  const items = useItems(hid);
  const events = useEvents(hid);
  const movs = useMovements(hid);
  const sw = useSwitchHousehold(userId);
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);

  const counts = {
    items: items.data?.length ?? 0,
    events: events.data?.length ?? 0,
    movs: movs.data?.length ?? 0,
  };
  const hasData = counts.items + counts.events + counts.movs > 0;
  const valid = code.trim().length === 8;

  const go = () => sw.mutate({ code: code.trim(), displayName: me?.display_name ?? 'Yo' });

  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-bg p-4">
      <h3 className="m-0 text-[15px] font-extrabold">¿Tu pareja ya tiene un hogar en Lola?</h3>
      <p className="m-0 text-[13px] font-medium text-muted">Pídele su código de invitación y únete a su hogar.</p>
      {!confirming ? (
        <>
          <label htmlFor="switch-code" className="sr-only">
            Código de invitación
          </label>
          <input
            id="switch-code"
            className={`${inputCls} text-center text-[20px] tracking-[0.3em] uppercase`}
            value={code}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABCD2345"
            onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
          />
          <PrimaryButton
            tone="ink"
            disabled={!valid || sw.isPending}
            onClick={() => (hasData ? setConfirming(true) : go())}
          >
            {sw.isPending ? 'Uniéndome…' : 'Unirme a su hogar'}
          </PrimaryButton>
        </>
      ) : (
        <>
          <p role="alert" className="m-0 rounded-2xl bg-gasto-tint p-3 text-[14px] font-semibold text-gasto">
            Tu hogar actual se borrará con {counts.items} pendientes, {counts.events} eventos y {counts.movs}{' '}
            movimientos. No se puede deshacer.
          </p>
          <PrimaryButton tone="gasto" disabled={sw.isPending} onClick={go}>
            {sw.isPending ? 'Uniéndome…' : 'Borrar mi hogar y unirme'}
          </PrimaryButton>
          <GhostButton onClick={() => setConfirming(false)}>Cancelar</GhostButton>
        </>
      )}
      {sw.error && <p className="m-0 text-[13px] font-semibold text-gasto">{friendlyError(sw.error)}</p>}
    </section>
  );
}
