-- Orden manual de pendientes (arrastrar para reordenar dentro de cada prioridad).
-- Menor = más arriba. Los nuevos se crean con -epoch_ms (quedan arriba); al soltar se usa el punto medio.
alter table public.items add column if not exists sort_order double precision;

update public.items
set sort_order = -extract(epoch from created_at) * 1000
where sort_order is null;

alter table public.items alter column sort_order set default (-extract(epoch from now()) * 1000);
alter table public.items alter column sort_order set not null;

create index if not exists items_sort_idx on public.items (household_id, priority, sort_order);
