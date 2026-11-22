import { useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/context';
import { Icon } from '../../ui/Icon';
import { Avatar } from '../../ui/kit';
import { FinanceView } from '../finance/FinanceView';
import { SettingsSheet } from '../settings/SettingsSheet';

/** Espacio privado: Mis finanzas (solo la ve quien la creó) + acceso a Hogar y ajustes. */
export function MeScreen() {
  const { userId, memberById } = useApp();
  const me = memberById(userId);
  const [settings, setSettings] = useState(false);

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to="/"
            aria-label="Volver a Ahora"
            className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-muted"
          >
            <Icon name="chevronLeft" size={24} stroke={2.4} />
          </Link>
          <Avatar member={me} size={40} />
          <div className="flex min-w-0 flex-col">
            <h1 className="m-0 truncate text-[26px] leading-tight font-bold tracking-tight">
              {me?.display_name ?? 'Yo'}
            </h1>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-muted">
              <Icon name="lock" size={13} stroke={2.4} /> Solo tú ves esto
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettings(true)}
          aria-label="Hogar y ajustes"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted"
        >
          <Icon name="settings" size={20} />
        </button>
      </header>

      <FinanceView />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </main>
  );
}
