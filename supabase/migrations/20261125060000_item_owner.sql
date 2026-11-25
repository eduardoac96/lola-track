-- v1.8 · Pendientes por dueño (T50).
-- owner_id null = "Casa" (de todos). Con dueño = personal, pero visible para todo el hogar (RLS sin cambios).

alter table public.items add column if not exists owner_id uuid;
alter table public.items
  add constraint items_owner_member_fk
  foreign key (household_id, owner_id) references public.household_members (household_id, user_id)
  on delete set null (owner_id);
create index if not exists items_owner_idx on public.items (household_id, owner_id) where owner_id is not null;

-- Urgentes: ahora devuelve el dueño de cada pendiente para avisar solo a quien le toca
-- (Casa → todos; personal → solo su dueño). Cambia el tipo de retorno: hay que recrearla.
drop function if exists public.urgent_reminders();
create function public.urgent_reminders()
returns table (household_id uuid, slot timestamptz, item_ids uuid[], titles text[], owner_ids uuid[])
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
         array_agg(i.title order by i.sort_order, i.created_at),
         array_agg(i.owner_id order by i.sort_order, i.created_at)
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
