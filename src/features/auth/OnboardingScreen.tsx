import { useState, type FormEvent } from 'react';
import { friendlyError, useCreateHousehold, useJoinHousehold } from '../../data/household';
import { signOut } from '../../data/session';
import { Field, PrimaryButton, Segmented, inputCls } from '../../ui/kit';

export function OnboardingScreen({ userId, email }: { userId: string; email: string }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [displayName, setDisplayName] = useState('');
  const [homeName, setHomeName] = useState('Nuestra casa');
  const [code, setCode] = useState('');
  const create = useCreateHousehold(userId);
  const join = useJoinHousehold(userId);
  const busy = create.isPending || join.isPending;
  const error = create.error ?? join.error;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'create') create.mutate({ name: homeName.trim(), displayName: displayName.trim() });
    else join.mutate({ code: code.trim(), displayName: displayName.trim() });
  };

  const valid =
    displayName.trim().length > 0 && (mode === 'create' ? homeName.trim().length > 0 : code.trim().length === 8);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-muted">{email}</span>
        <h1 className="m-0 text-[28px] font-extrabold tracking-tight">Configura tu hogar</h1>
        <p className="m-0 text-[15px] font-medium text-muted">
          Uno crea el hogar y le comparte un código al otro. Es una sola vez.
        </p>
      </header>

      <Segmented
        label="Crear o unirme"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'create', label: 'Crear hogar' },
          { value: 'join', label: 'Tengo un código' },
        ]}
      />

      {mode === 'create' && (
        <p className="m-0 -mt-2 rounded-2xl bg-arreglo-tint p-3 text-[13px] font-semibold text-arreglo-fg">
          Si tu pareja ya creó el hogar, no crees otro: elige «Tengo un código» y escribe el suyo.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Tu nombre (así te verá tu pareja)">
          <input
            className={inputCls}
            value={displayName}
            maxLength={40}
            autoComplete="given-name"
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Odin"
          />
        </Field>
        {mode === 'create' ? (
          <Field label="Nombre del hogar">
            <input className={inputCls} value={homeName} maxLength={60} onChange={(e) => setHomeName(e.target.value)} />
          </Field>
        ) : (
          <Field label="Código de invitación" hint="8 letras y números, te lo comparte quien creó el hogar.">
            <input
              className={`${inputCls} text-center text-[22px] tracking-[0.3em] uppercase`}
              value={code}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())}
              placeholder="ABCD2345"
            />
          </Field>
        )}
        <PrimaryButton type="submit" disabled={!valid || busy}>
          {busy ? 'Un momento…' : mode === 'create' ? 'Crear hogar' : 'Unirme'}
        </PrimaryButton>
        {error && (
          <p role="alert" className="m-0 rounded-2xl bg-gasto-tint p-3 text-[14px] font-semibold text-gasto">
            {friendlyError(error)}
          </p>
        )}
      </form>

      <button type="button" className="h-11 text-[14px] font-bold text-muted" onClick={() => signOut()}>
        Usar otro correo
      </button>
    </main>
  );
}
