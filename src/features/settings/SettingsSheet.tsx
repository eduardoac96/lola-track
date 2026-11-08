import { useEffect, useState } from 'react';
import { useApp } from '../../app/context';
import { friendlyError, useCreateInvite } from '../../data/household';
import { MIN_PASSWORD, changePassword, signOut } from '../../data/session';
import { disablePush, enablePush, getPushState, type PushState } from '../../lib/push';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { Avatar, Field, GhostButton, PrimaryButton, inputCls, useToast } from '../../ui/kit';
import { ChecklistButton } from '../items/ChecklistButton';

const PUSH_COPY: Record<PushState, string> = {
  on: 'Avisos activados en este dispositivo.',
  off: 'Recibe un aviso antes de cada evento de la agenda.',
  denied: 'Bloqueaste las notificaciones. Actívalas en Ajustes del iPhone → Lola.',
  'needs-install': 'Para avisos en iPhone: Compartir → "Agregar a pantalla de inicio" y abre Lola desde ahí.',
  unsupported: 'Este navegador no soporta avisos.',
  'no-key': 'Avisos pendientes de configurar (llave VAPID).',
};

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hid, household, members, email, userId } = useApp();
  const invite = useCreateInvite();
  const [push, setPush] = useState<PushState | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (open)
      getPushState()
        .then(setPush)
        .catch(() => setPush('unsupported'));
  }, [open]);

  const shareCode = async (code: string) => {
    const text = `Únete a "${household.name}" en Lola Track con el código ${code}\n${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Lola Track', text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelado */
    }
  };

  const togglePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      setPush(push === 'on' ? await disablePush() : await enablePush(hid));
    } catch (e) {
      setPushError(friendlyError(e));
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={household.name}>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-[13px] font-bold text-muted">Miembros</h3>
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <Avatar member={m} />
              <span className="text-[15px] font-bold">
                {m.display_name}
                {m.user_id === userId && <span className="font-semibold text-muted"> · tú</span>}
              </span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-bg p-4">
          <h3 className="m-0 text-[15px] font-extrabold">Invitar a tu pareja</h3>
          {invite.data ? (
            <>
              <p className="m-0 text-center text-[32px] font-extrabold tracking-[0.25em]" aria-live="polite">
                {invite.data}
              </p>
              <p className="m-0 text-center text-[12px] font-medium text-muted">Vale 7 días y se usa una sola vez.</p>
              <PrimaryButton onClick={() => shareCode(invite.data)}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="share" size={20} /> Compartir código
                </span>
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton disabled={invite.isPending} onClick={() => invite.mutate(hid)}>
              {invite.isPending ? 'Generando…' : 'Generar código'}
            </PrimaryButton>
          )}
          {invite.error && <p className="m-0 text-[13px] font-semibold text-gasto">{friendlyError(invite.error)}</p>}
        </section>

        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-bg p-4">
          <h3 className="m-0 flex items-center gap-2 text-[15px] font-extrabold">
            <Icon name="bell" size={18} /> Avisos
          </h3>
          <p className="m-0 text-[13px] font-medium text-muted">{push ? PUSH_COPY[push] : '…'}</p>
          {(push === 'on' || push === 'off') && (
            <PrimaryButton tone={push === 'on' ? 'ink' : 'primary'} disabled={pushBusy} onClick={togglePush}>
              {pushBusy ? 'Un momento…' : push === 'on' ? 'Desactivar avisos' : 'Activar avisos'}
            </PrimaryButton>
          )}
          {pushError && <p className="m-0 text-[13px] font-semibold text-gasto">{pushError}</p>}
        </section>

        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-bg p-4">
          <h3 className="m-0 text-[15px] font-extrabold">Checklist de llegada</h3>
          <p className="m-0 text-[13px] font-medium text-muted">
            Agrega los pendientes sugeridos que todavía no tienes. No duplica.
          </p>
          <ChecklistButton tone="ink" />
        </section>

        <PasswordSection />

        <div className="flex flex-col items-center gap-1">
          <span className="text-[12px] font-medium text-muted">{email}</span>
          <GhostButton danger onClick={() => signOut()}>
            <Icon name="logout" size={18} /> Cerrar sesión
          </GhostButton>
        </div>
      </div>
    </Sheet>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return <GhostButton onClick={() => setOpen(true)}>Cambiar mi contraseña</GhostButton>;
  }
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-bg p-4">
      <Field label="Nueva contraseña" hint={`Mínimo ${MIN_PASSWORD} caracteres.`}>
        <input
          className={inputCls}
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </Field>
      <PrimaryButton
        tone="ink"
        disabled={busy || pw.length < MIN_PASSWORD}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await changePassword(pw);
            toast({ text: 'Contraseña actualizada' });
            setPw('');
            setOpen(false);
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Guardando…' : 'Guardar contraseña'}
      </PrimaryButton>
      {error && <p className="m-0 text-[13px] font-semibold text-gasto">{error}</p>}
    </section>
  );
}
