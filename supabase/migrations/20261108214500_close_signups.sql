-- Registro cerrado a nivel base: cualquier cuenta nueva se rechaza (equivale a "Allow new users to sign up" = off).
-- Para reabrir el registro:  drop trigger lola_block_signups on auth.users;
create or replace function public.block_new_signups()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Signups not allowed for this instance' using errcode = 'P0001';
end $$;

revoke execute on function public.block_new_signups() from public, anon, authenticated;

drop trigger if exists lola_block_signups on auth.users;
create trigger lola_block_signups
  before insert on auth.users
  for each row execute function public.block_new_signups();
