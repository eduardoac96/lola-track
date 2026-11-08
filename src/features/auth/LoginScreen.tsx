import { useState, type FormEvent } from 'react';
import { MIN_PASSWORD, signIn, signUp } from '../../data/session';
import { friendlyError } from '../../data/household';
import { Field, PrimaryButton, Segmented, inputCls } from '../../ui/kit';

/**
 * Correo + contraseña. Sin correos de confirmación: el iPhone guarda la contraseña en el Llavero
 * (autocomplete current-password / new-password) y funciona igual dentro de la app instalada.
 */
export function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.includes('@') && password.length >= (mode === 'signup' ? MIN_PASSWORD : 1);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const mail = email.trim().toLowerCase();
      if (mode === 'signin') await signIn(mail, password);
      else {
        const { needsConfirmation } = await signUp(mail, password);
        if (needsConfirmation) {
          setError(
            'La cuenta quedó creada pero Supabase pide confirmarla por correo. Hay que desactivar "Confirm email".',
          );
          setBusy(false);
        }
      }
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6 py-10">
      <header className="flex flex-col gap-3">
        <img src="/icon-192.png" alt="" width={64} height={64} className="size-16 rounded-[20px]" />
        <h1 className="m-0 text-[32px] leading-tight font-extrabold tracking-tight">Lola Track</h1>
        <p className="m-0 text-[15px] font-medium text-muted">
          Pendientes, agenda y presupuesto de la casa, en un solo lugar.
        </p>
      </header>

      <Segmented
        label="Entrar o crear cuenta"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: 'signin', label: 'Entrar' },
          { value: 'signup', label: 'Crear cuenta' },
        ]}
      />

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Correo">
          <input
            className={inputCls}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </Field>
        <Field
          label="Contraseña"
          hint={
            mode === 'signup'
              ? `Mínimo ${MIN_PASSWORD} caracteres. Tu iPhone puede sugerir una y guardarla.`
              : undefined
          }
        >
          <input
            className={inputCls}
            type={show ? 'text' : 'password'}
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'signup' ? MIN_PASSWORD : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-pressed={show}
          className="-mt-2 h-11 self-start text-[14px] font-bold text-primary-hover"
        >
          {show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        </button>
        <PrimaryButton type="submit" disabled={busy || !valid}>
          {busy ? 'Un momento…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
        </PrimaryButton>
      </form>

      {error && (
        <p role="alert" className="m-0 rounded-2xl bg-gasto-tint p-3 text-[14px] font-semibold text-gasto">
          {error}
        </p>
      )}

      {mode === 'signin' && (
        <p className="m-0 text-center text-[13px] font-medium text-muted">
          ¿Olvidaste la contraseña? Pídele a quien administra Lola que la restablezca.
        </p>
      )}
    </main>
  );
}
