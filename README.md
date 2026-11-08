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

## Pendientes manuales (requieren tus cuentas)

1. **Correo con código (T02b)**: Supabase → Authentication → Email Templates → _Magic Link_ → en el cuerpo pon `{{ .Token }}` (ej. `Tu código para Lola Track: {{ .Token }}`). Sin esto llega un link y el login por código no funciona.
2. **Publicar (T11)**: Cloudflare → Workers & Pages → Create → Pages → conectar `eduardoac96/lola-track`. Build `npm run build`, salida `dist`. Variables: copia las 3 de `.env.example`.
3. **URL en Supabase**: Authentication → URL Configuration → _Site URL_ = la dirección que te dé Cloudflare.
4. **En cada iPhone**: abrir la URL en Safari → Compartir → _Agregar a pantalla de inicio_ → abrir Lola desde el ícono → tocar los avatares → _Activar avisos_.

## Backend (ya configurado en `xkiumlisdkxwqlvuqneg`)

- 5 migraciones aplicadas (`supabase/migrations/`), RLS verificado.
- Llaves VAPID y secreto del cron en Vault (nada que configurar a mano).
- Edge Function `send-reminders` + pg_cron `lola-send-reminders` (cada 5 min): avisos de eventos y de pendientes con fecha.
