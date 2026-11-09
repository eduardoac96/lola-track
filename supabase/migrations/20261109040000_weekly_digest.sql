-- Resumen semanal: domingo desde las 19:00 (Monterrey), un push por hogar.
-- send-reminders llama weekly_digests() y "reclama" el hogar con last_weekly_digest antes de enviar.

alter table public.households add column if not exists last_weekly_digest date;

create or replace function public.weekly_digests()
returns table (household_id uuid, done_count int, spent_cents bigint, urgent_pending int, week date)
language sql stable security definer set search_path = public as $$
  with clock as (
    select (now() at time zone 'America/Monterrey') as local_now,
           (now() at time zone 'America/Monterrey')::date as local_day
  )
  select h.id,
         (select count(*)::int from items i
            where i.household_id = h.id and i.done_at >= now() - interval '7 days'),
         (select coalesce(-sum(m.amount_cents), 0)::bigint from budget_movements m
            where m.household_id = h.id and m.amount_cents < 0 and m.created_at >= now() - interval '7 days'),
         (select count(*)::int from items i
            where i.household_id = h.id and i.priority = 'urgente' and i.done_at is null),
         c.local_day
  from households h, clock c
  where extract(dow from c.local_now) = 0
    and extract(hour from c.local_now) >= 19
    and (h.last_weekly_digest is null or h.last_weekly_digest < c.local_day);
$$;
revoke execute on function public.weekly_digests() from public, anon, authenticated;
grant  execute on function public.weekly_digests() to service_role;
