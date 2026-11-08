import { useState, type FormEvent } from 'react';
import { requestOtp, verifyOtp } from '../../data/session';
import { friendlyError } from '../../data/household';
import { Field, PrimaryButton, inputCls } from '../../ui/kit';

/** Login con código de 6 dígitos por correo (sin magic links: en iOS abrirían Safari, no la PWA). */
export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestOtp(email.trim().toLowerCase());
      setStep('code');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(email.trim().toLowerCase(), code.trim());
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <img src="/icon-192.png" alt="" width={64} height={64} className="size-16 rounded-[20px]" />
        <h1 className="m-0 text-[32px] leading-tight font-extrabold tracking-tight">Lola Track</h1>
        <p className="m-0 text-[15px] font-medium text-muted">
          Pendientes, agenda y presupuesto de la casa, en un solo lugar.
        </p>
      </header>

      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <Field label="Tu correo">
            <input
              className={inputCls}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy || !email.includes('@')}>
            {busy ? 'Enviando…' : 'Enviarme un código'}
          </PrimaryButton>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <Field label={`Código que enviamos a ${email}`} hint="Revisa también spam. El código dura 10 minutos.">
            <input
              className={`${inputCls} text-center text-[26px] tracking-[0.4em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              data-autofocus
            />
          </Field>
          <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'Entrando…' : 'Entrar'}
          </PrimaryButton>
          <div className="flex justify-between text-[14px] font-bold">
            <button type="button" className="h-11 text-primary-hover" onClick={() => setStep('email')}>
              Cambiar correo
            </button>
            <button type="button" className="h-11 text-primary-hover" disabled={busy} onClick={() => sendCode()}>
              Reenviar código
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-2xl bg-gasto-tint p-3 text-[14px] font-semibold text-gasto">
          {error}
        </p>
      )}
    </main>
  );
}
