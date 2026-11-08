-- Llaves VAPID desde Vault (sin secrets manuales en Edge Functions) + recordatorio de pendientes con fecha (T22).

-- 1) Config de Web Push para la Edge Function (service_role).
create or replace function public.get_push_config()
returns table (public_key text, private_key text)
language sql stable security definer set search_path = public as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'lola_vapid_public'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'lola_vapid_private');
$$;
revoke execute on function public.get_push_config() from public, anon, authenticated;
grant  execute on function public.get_push_config() to service_role;

-- 2) Pendientes con fecha: un aviso por pendiente el día que vence (desde las 8:00 Monterrey).
alter table public.items add column if not exists due_reminded_at timestamptz;

create or replace function public.items_before_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.due_date is distinct from old.due_date then
    new.due_reminded_at := null;  -- nueva fecha → nuevo aviso
  end if;
  return new;
end $$;
drop trigger if exists items_updated_at on public.items;
create trigger items_before_update before update on public.items
  for each row execute function public.items_before_update();

create index if not exists items_due_pending_idx on public.items (due_date)
  where done_at is null and due_reminded_at is null and due_date is not null;

create or replace function public.due_item_reminders()
returns table (household_id uuid, item_ids uuid[], titles text[])
language sql stable security definer set search_path = public as $$
  select i.household_id, array_agg(i.id order by i.priority, i.created_at), array_agg(i.title order by i.priority, i.created_at)
  from items i
  where i.done_at is null
    and i.due_reminded_at is null
    and i.due_date is not null
    and i.due_date <= (now() at time zone 'America/Monterrey')::date
    and extract(hour from now() at time zone 'America/Monterrey') >= 8
  group by i.household_id;
$$;
revoke execute on function public.due_item_reminders() from public, anon, authenticated;
grant  execute on function public.due_item_reminders() to service_role;
