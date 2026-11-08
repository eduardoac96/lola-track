# RLS smoke tests (Postgres 16 vanilla, sin Supabase)

```bash
createdb nido_test
psql -d nido_test -f 00_supabase_stub.sql -f ../migrations/20261108000000_init.sql -f 01_grants.sql
psql -d nido_test -f 10_rls_smoke.sql   # cada NOTICE "... blocked" = caso de seguridad OK
```
Cubre: crear hogar/invitar/unirse, código de un solo uso, aislamiento entre hogares (select/insert/update/RPC/storage),
movimiento cruzado bloqueado, complete_item → saldo, reopen_item → reversa, reset de recordatorio, due_reminders.
