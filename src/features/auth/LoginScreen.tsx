import { useState, type FormEvent } from 'react';
import { parseEmailLink, requestOtp, verifyEmailLink, verifyOtp } from '../../data/session';
import { friendlyError } from '../../data/household';
import { Field, PrimaryButton, inputCls } from '../../ui/kit';

/**
 * Login sin contraseña. El correo puede traer un código de 6 dígitos o un link:
 * - Código: se escribe aquí.
 * - Link: en la computadora basta tocarlo; en la app instalada del iPhone (que no comparte sesión
 *   con Safari) se copia el link y se pega aquí.
 */
export function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = value.replace(/\D/g, '');
  const isLink = parseEmailLink(value) != null;
  const ready = isLink || (digits.length === 6 && !/[a-z]/i.test(value));

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
      if (isLink) await verifyEmailLink(value);
      else await verifyOtp(email.trim().toLowerCase(), digits);
    } catch (err) {
      setError(isLink ? 'El link no es válido o ya se usó. Pide uno nuevo y cópialo sin abrirlo.' : friendlyError(err));
      setBusy(false);
    }
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text.trim());
    } catch {
      setError('No pude leer el portapapeles. Mantén presionado el campo y elige "Pegar".');
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
          <p className="m-0 text-[14px] font-medium text-muted">
            Te enviamos un correo a <b className="text-ink">{email}</b>. Si trae un <b>código</b>, escríbelo. Si trae un{' '}
            <b>link</b>: en la computadora tócalo; en la app del iPhone mantén presionado el botón del correo, elige
            “Copiar” y pégalo aquí.
          </p>
          <Field label="Código o link del correo" hint="Revisa también spam. Vence en unos minutos.">
            <input
              className={`${inputCls} ${isLink ? 'text-[14px]' : 'text-center text-[24px] tracking-[0.3em]'}`}
              inputMode={isLink ? 'url' : 'numeric'}
              autoComplete="one-time-code"
              autoCapitalize="off"
              autoCorrect="off"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="123456"
              data-autofocus
            />
          </Field>
          <button
            type="button"
            onClick={paste}
            className="-mt-2 h-11 self-start text-[14px] font-bold text-primary-hover"
          >
            Pegar del portapapeles
          </button>
          <PrimaryButton type="submit" disabled={busy || !ready}>
            {busy ? 'Entrando…' : 'Entrar'}
          </PrimaryButton>
          <div className="flex justify-between text-[14px] font-bold">
            <button type="button" className="h-11 text-primary-hover" onClick={() => setStep('email')}>
              Cambiar correo
            </button>
            <button type="button" className="h-11 text-primary-hover" disabled={busy} onClick={() => sendCode()}>
              Reenviar
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
