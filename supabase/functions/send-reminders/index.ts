// Lola Track · send-reminders
// pg_cron la llama cada 5 min con el header x-cron-secret (Vault: lola_cron_secret).
// 1) Eventos con aviso vencido → un push por evento.
// 2) Pendientes cuya fecha llegó (desde las 8:00) → un push por hogar con la lista.
// 3) Domingo desde las 19:00 → resumen semanal por hogar (weekly_digests / last_weekly_digest).
// Cada aviso se "reclama" antes de enviarse (reminded_at / due_reminded_at) para no duplicar.
// Llaves VAPID: secrets de la función si existen; si no, Vault vía get_push_config().
// Cada aviso lleva `badge` = urgentes sin hacer, para el número del ícono.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function whenText(startsAt: string, now: number): string {
  const mins = Math.max(0, Math.round((Date.parse(startsAt) - now) / 60_000));
  const local = new Date(startsAt).toLocaleString('en-US', { timeZone: 'America/Monterrey', hour12: false });
  const [, time = ''] = local.split(', ');
  const hhmm = time.slice(0, 5).replace(/^24/, '00');
  if (mins < 60) return `En ${mins} min · ${hhmm}`;
  if (mins < 24 * 60) return `En ${Math.round(mins / 60)} h · ${hhmm}`;
  return `Mañana · ${hhmm}`;
}

function listText(titles: string[]): string {
  const shown = titles.slice(0, 3).join(', ');
  return titles.length > 3 ? `${shown} y ${titles.length - 3} más` : shown;
}

type Stats = { sent: number; pruned: number };

const mxn = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100);

export function digestText(d: { done_count: number; spent_cents: number; urgent_pending: number }): string | null {
  if (d.done_count === 0 && d.spent_cents === 0 && d.urgent_pending === 0) return null;
  const parts = [
    d.done_count === 1 ? '1 pendiente hecho' : `${d.done_count} pendientes hechos`,
    d.spent_cents > 0 ? `${mxn(d.spent_cents)} gastados` : null,
    d.urgent_pending > 0 ? `${d.urgent_pending} urgente${d.urgent_pending === 1 ? '' : 's'} para la semana` : 'nada urgente',
  ].filter(Boolean);
  return `Esta semana: ${parts.join(', ')}.`;
}

/** Pendientes urgentes sin hacer → número del ícono de la app. */
async function urgentCount(sb: SupabaseClient, householdId: string): Promise<number> {
  const { count } = await sb
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('priority', 'urgente')
    .is('done_at', null);
  return count ?? 0;
}

async function sendToHousehold(sb: SupabaseClient, householdId: string, payload: object, stats: Stats) {
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('household_id', householdId);
  if (!subs?.length) return;
  const body = JSON.stringify({ ...payload, badge: await urgentCount(sb, householdId) });
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 3600,
          urgency: 'high',
        });
        stats.sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await sb.from('push_subscriptions').delete().eq('id', s.id);
          stats.pruned++;
        } else {
          console.error('push failed', code, (e as Error).message);
        }
      }
    }),
  );
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

  let pub = Deno.env.get('VAPID_PUBLIC_KEY');
  let priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) {
    const { data: cfg } = await sb.rpc('get_push_config').maybeSingle<{ public_key: string; private_key: string }>();
    pub = cfg?.public_key ?? undefined;
    priv = cfg?.private_key ?? undefined;
  }
  if (!pub || !priv) return json({ skipped: 'vapid not configured' });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@lola-track.app', pub, priv);

  const now = Date.now();
  const stats: Stats = { sent: 0, pruned: 0 };
  let events = 0;
  let dueHouseholds = 0;

  // 1) Eventos
  const { data: due, error } = await sb.rpc('due_reminders');
  if (error) return json({ error: error.message }, 500);
  for (const ev of due ?? []) {
    const { data: claimed } = await sb
      .from('events')
      .update({ reminded_at: new Date().toISOString() })
      .eq('id', ev.event_id)
      .is('reminded_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;
    events++;
    await sendToHousehold(
      sb,
      ev.household_id,
      {
        title: ev.title,
        body: [whenText(ev.starts_at, now), ev.place].filter(Boolean).join(' · '),
        url: '/agenda',
        tag: `event-${ev.event_id}`,
      },
      stats,
    );
  }

  // 2) Pendientes que vencen hoy (o antes)
  const { data: dueItems } = await sb.rpc('due_item_reminders');
  for (const h of dueItems ?? []) {
    const { data: claimed } = await sb
      .from('items')
      .update({ due_reminded_at: new Date().toISOString() })
      .in('id', h.item_ids)
      .is('due_reminded_at', null)
      .is('done_at', null)
      .select('title');
    const titles = (claimed ?? []).map((r: { title: string }) => r.title);
    if (titles.length === 0) continue;
    dueHouseholds++;
    await sendToHousehold(
      sb,
      h.household_id,
      {
        title: titles.length === 1 ? 'Pendiente para hoy' : `${titles.length} pendientes para hoy`,
        body: listText(titles),
        url: '/pendientes',
        tag: `due-${new Date().toISOString().slice(0, 10)}`,
      },
      stats,
    );
  }

  // 3) Resumen semanal (domingo ≥ 19:00 Monterrey)
  let digests = 0;
  const { data: weekly } = await sb.rpc('weekly_digests');
  for (const d of weekly ?? []) {
    const { data: claimed } = await sb
      .from('households')
      .update({ last_weekly_digest: d.week })
      .eq('id', d.household_id)
      .or(`last_weekly_digest.is.null,last_weekly_digest.lt.${d.week}`)
      .select('id')
      .maybeSingle();
    if (!claimed) continue;
    const body = digestText(d);
    if (!body) continue;
    digests++;
    await sendToHousehold(sb, d.household_id, { title: 'Resumen de la semana', body, url: '/', tag: `digest-${d.week}` }, stats);
  }

  return json({ events, dueHouseholds, digests, ...stats });
});
