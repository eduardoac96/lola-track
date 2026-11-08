// Lola Track · send-reminders
// pg_cron la llama cada 5 min con el header x-cron-secret (guardado en Vault).
// Toma eventos con aviso vencido, los "reclama" (reminded_at) para no duplicar y manda Web Push
// a todas las suscripciones del hogar. Endpoints 404/410 se borran.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function whenText(startsAt: string, now: number): string {
  const mins = Math.max(0, Math.round((Date.parse(startsAt) - now) / 60_000));
  // Hora local del hogar (Monterrey)
  const local = new Date(startsAt).toLocaleString('en-US', { timeZone: 'America/Monterrey', hour12: false });
  const [, time = ''] = local.split(', ');
  const hhmm = time.slice(0, 5).replace(/^24/, '00');
  if (mins < 60) return `En ${mins} min · ${hhmm}`;
  if (mins < 24 * 60) return `En ${Math.round(mins / 60)} h · ${hhmm}`;
  return `Mañana · ${hhmm}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'missing supabase env' }, 500);
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: ok, error: authErr } = await sb.rpc('verify_cron_secret', {
    p_secret: req.headers.get('x-cron-secret') ?? '',
  });
  if (authErr || ok !== true) return json({ error: 'forbidden' }, 403);

  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return json({ skipped: 'vapid not configured' });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@lola-track.app', pub, priv);

  const { data: due, error } = await sb.rpc('due_reminders');
  if (error) return json({ error: error.message }, 500);

  const now = Date.now();
  let sent = 0;
  let pruned = 0;
  let events = 0;

  for (const ev of due ?? []) {
    // Reclamo atómico: si otra ejecución ya lo tomó, no hay fila y se salta.
    const { data: claimed } = await sb
      .from('events')
      .update({ reminded_at: new Date().toISOString() })
      .eq('id', ev.event_id)
      .is('reminded_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;
    events++;

    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('household_id', ev.household_id);

    const payload = JSON.stringify({
      title: ev.title,
      body: [whenText(ev.starts_at, now), ev.place].filter(Boolean).join(' · '),
      url: '/agenda',
      tag: `event-${ev.event_id}`,
    });

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: 3600,
            urgency: 'high',
          });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await sb.from('push_subscriptions').delete().eq('id', s.id);
            pruned++;
          } else {
            console.error('push failed', code, (e as Error).message);
          }
        }
      }),
    );
  }

  return json({ events, sent, pruned });
});
