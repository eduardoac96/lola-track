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
- `npm test` · `npm run build` · `npm run lint` · `npm run e2e` (Playwright; `CHROME_PATH=/ruta/chrome` si no instalaste sus navegadores)

## Estado del despliegue

- ✅ Cloudflare Pages: https://lola-track.pages.dev (build `npm run build` → `dist`, Node 22; variables públicas en `.env.production`).
- ✅ Supabase Auth Site URL = https://lola-track.pages.dev.
- ⏳ **Correo (requiere tu cuenta)**: el SMTP integrado de Supabase solo envía a miembros del equipo de la organización y no permite editar plantillas. Configura un SMTP propio (p. ej. Brevo gratis) en Supabase → Authentication → Emails → SMTP Settings. Después se editan las plantillas _Magic link or OTP_ y _Confirm sign up_ para incluir `{{ .Token }}`.
- Mientras tanto la app acepta el **link** del correo: tocarlo en la computadora, o copiarlo y pegarlo en la app del iPhone.

## Backend (ya configurado en `xkiumlisdkxwqlvuqneg`)

- 5 migraciones aplicadas (`supabase/migrations/`), RLS verificado.
- Llaves VAPID y secreto del cron en Vault (nada que configurar a mano).
- Edge Function `send-reminders` + pg_cron `lola-send-reminders` (cada 5 min): avisos de eventos y de pendientes con fecha.
