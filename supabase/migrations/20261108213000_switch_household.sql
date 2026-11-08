-- Cambiar de hogar con un código (para quien creó un hogar propio por error).
-- Sale de sus hogares actuales; si quedaba solo en alguno, ese hogar se borra con sus datos (la UI avisa antes).
create or replace function public.switch_household(p_code text, p_display_name text, p_color text default '#F5A524')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv household_invites%rowtype;
  h uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into inv from household_invites where code = upper(trim(p_code)) for update;
  if not found or inv.used_at is not null or inv.expires_at < now() then
    raise exception 'invalid or expired code';
  end if;
  if exists (select 1 from household_members where household_id = inv.household_id and user_id = auth.uid()) then
    return inv.household_id;
  end if;
  if (select count(*) from household_members where household_id = inv.household_id) >= 4 then
    raise exception 'household is full';
  end if;

  for h in select household_id from household_members where user_id = auth.uid() loop
    delete from push_subscriptions where user_id = auth.uid() and household_id = h;
    delete from household_members where household_id = h and user_id = auth.uid();
    if not exists (select 1 from household_members where household_id = h) then
      delete from households where id = h;  -- cascada: pendientes, eventos, bolsas, movimientos, invitaciones
    end if;
  end loop;

  insert into household_members (household_id, user_id, display_name, color)
    values (inv.household_id, auth.uid(), trim(p_display_name), p_color);
  update household_invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.household_id;
end $$;

revoke execute on function public.switch_household(text, text, text) from public, anon;
grant  execute on function public.switch_household(text, text, text) to authenticated;
