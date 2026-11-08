# Lola Track

Pendientes, agenda y presupuesto compartidos para el hogar. PWA para iPhone, iPad y web, con sincronización en tiempo real.

- Spec: [`specs/001-mvp/spec.md`](specs/001-mvp/spec.md)
- Plan técnico: [`specs/001-mvp/plan.md`](specs/001-mvp/plan.md)
- Tareas: [`specs/001-mvp/tasks.md`](specs/001-mvp/tasks.md)
- Base de datos: [`supabase/migrations/20261108000000_init.sql`](supabase/migrations/20261108000000_init.sql)
- Parser de captura rápida: [`src/lib/quickAdd.ts`](src/lib/quickAdd.ts)

## Arranque

1. Crea un proyecto en Supabase → `supabase link` → `supabase db push`.
2. Auth → Email: activa OTP y cambia la plantilla para que muestre `{{ .Token }}`.
3. `cp .env.example .env` y llena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Ejecuta las tareas de `tasks.md` en orden (T01 → T11 = usable en el iPhone).
