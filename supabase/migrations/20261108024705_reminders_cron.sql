-- Recordatorios: extensiones para cron + http y verificación del secreto del cron (guardado en Vault).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- La Edge Function send-reminders llama esto con el header x-cron-secret.
create or replace function public.verify_cron_secret(p_secret text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'lola_cron_secret' and decrypted_secret = p_secret and length(p_secret) >= 32
  );
$$;
revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
grant  execute on function public.verify_cron_secret(text) to service_role;

-- Programación (por entorno, NO en migración porque lleva la URL del proyecto):
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'lola_cron_secret');
--   select cron.schedule('lola-send-reminders', '*/5 * * * *', $c$
--     select net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
--       headers := jsonb_build_object('Content-Type','application/json',
--         'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lola_cron_secret')),
--       body := '{}'::jsonb);
--   $c$);
