-- v1.4 · Listas (T38): agrupar pendientes por evento o tema ("Posada", "Mandado", "Fiesta fin de año").
-- items.list_id null = "General". Archivar una lista oculta sus pendientes de la app y de los avisos.

create table public.lists (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 40),
  sort_order    double precision not null default (extract(epoch from now()) * 1000),
  archived_at   timestamptz,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, id)
);
-- Sin nombres repetidos entre listas activas del mismo hogar.
create unique index lists_household_name_uq on public.lists (household_id, lower(btrim(name))) where archived_at is null;
create index lists_created_by_idx on public.lists (created_by);
create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();

alter table public.lists enable row level security;
create policy lists_select on public.lists for select to authenticated using (public.is_member(household_id));
create policy lists_insert on public.lists for insert to authenticated with check (public.is_member(household_id));
create policy lists_update on public.lists for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy lists_delete on public.lists for delete to authenticated using (public.is_member(household_id));

revoke all on public.lists from anon;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.lists to service_role;

-- FK compuesta: la lista debe ser del mismo hogar. Al borrar la lista, sus pendientes pasan a General.
alter table public.items add column list_id uuid;
alter table public.items
  add constraint items_list_fk foreign key (household_id, list_id)
  references public.lists (household_id, id) on delete set null (list_id);
create index items_list_idx on public.items (list_id) where list_id is not null;

alter publication supabase_realtime add table public.lists;

-- ───────────────────────── Avisos: ignorar pendientes de listas archivadas
create or replace function public.item_list_active(p_list uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_list is null or exists (select 1 from lists l where l.id = p_list and l.archived_at is null);
$$;
revoke execute on function public.item_list_active(uuid) from public, anon, authenticated;
grant  execute on function public.item_list_active(uuid) to service_role;

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
    and public.item_list_active(i.list_id)
  group by i.household_id;
$$;
revoke execute on function public.due_item_reminders() from public, anon, authenticated;
grant  execute on function public.due_item_reminders() to service_role;

create or replace function public.urgent_reminders()
returns table (household_id uuid, slot timestamptz, item_ids uuid[], titles text[])
language sql stable security definer set search_path = public as $$
  with clock as (
    select now() at time zone 'America/Monterrey' as ln
  ), cur as (
    select (date_trunc('day', ln) + make_interval(hours => case
              when extract(hour from ln) >= 19 then 19
              when extract(hour from ln) >= 13 then 13
              else 8 end)) at time zone 'America/Monterrey' as slot
    from clock
    where extract(hour from ln) >= 8
  )
  select i.household_id, c.slot,
         array_agg(i.id order by i.sort_order, i.created_at),
         array_agg(i.title order by i.sort_order, i.created_at)
  from items i
  join households h on h.id = i.household_id
  cross join cur c
  where i.priority = 'urgente'
    and i.done_at is null
    and public.item_list_active(i.list_id)
    and h.urgent_reminders
    and (h.last_urgent_reminder is null or h.last_urgent_reminder < c.slot)
  group by i.household_id, c.slot;
$$;
revoke execute on function public.urgent_reminders() from public, anon, authenticated;
grant  execute on function public.urgent_reminders() to service_role;

-- Número del ícono (send-reminders) sin contar listas archivadas.
create or replace function public.urgent_count(p_household uuid)
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from items i
  where i.household_id = p_household and i.priority = 'urgente' and i.done_at is null
    and public.item_list_active(i.list_id);
$$;
revoke execute on function public.urgent_count(uuid) from public, anon, authenticated;
grant  execute on function public.urgent_count(uuid) to service_role;
