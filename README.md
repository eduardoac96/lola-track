# Lola Track

Pendientes, agenda y presupuesto compartidos para el hogar. PWA para iPhone, iPad y web, con sincronización en tiempo real.

- Spec: [`specs/001-mvp/spec.md`](specs/001-mvp/spec.md)
- Plan técnico: [`specs/001-mvp/plan.md`](specs/001-mvp/plan.md)
- Tareas: [`specs/001-mvp/tasks.md`](specs/001-mvp/tasks.md)
- Base de datos: [`supabase/migrations/`](supabase/migrations/) — proyecto Supabase `xkiumlisdkxwqlvuqneg`
- Parser de captura rápida: [`src/lib/quickAdd.ts`](src/lib/quickAdd.ts)

## Arranque

```bash
npm i
cp .env.example .env      # URL + publishable key del proyecto (públicas por diseño)
npm run dev               # http://localhost:5173
```

- Vista previa de pantallas con datos de ejemplo, sin login ni backend: `http://localhost:5173/preview.html?screen=now|items|agenda|budget|login|onboarding`
- `npm test` · `npm run build` · `npm run lint`

## Pendientes manuales (requieren tus cuentas)

1. **T02b · Email OTP**: Supabase → Authentication → Email Templates → _Magic Link_: usa `{{ .Token }}` en el cuerpo (código de 6 dígitos). Sin esto llega un link y el login por código no funciona.
2. **T11 · Deploy**: Cloudflare Pages desde este repo (build `npm run build`, salida `dist`, variables `VITE_*`). Luego Site URL en Supabase Auth.
3. **T15b · Avisos**: `npx web-push generate-vapid-keys` → secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` en Supabase y `VITE_VAPID_PUBLIC_KEY` en Cloudflare.

## Backend (ya configurado en `xkiumlisdkxwqlvuqneg`)

- 4 migraciones aplicadas (`supabase/migrations/`), RLS verificado.
- Edge Function `send-reminders` + pg_cron `lola-send-reminders` (cada 5 min, secreto en Vault `lola_cron_secret`).
