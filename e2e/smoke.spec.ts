import { test, expect, type Page, type Route } from '@playwright/test';

/** Simula PostgREST: inserts devuelven la fila enviada; RPCs devuelven lo mínimo que la UI espera. */
async function mockSupabase(page: Page) {
  await page.route('**/rest/v1/**', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const now = new Date().toISOString();
    if (req.method() === 'POST' && url.pathname.endsWith('/rpc/complete_item')) {
      const body = req.postDataJSON() as { p_item: string; p_actual_cents?: number };
      return route.fulfill({
        json: { id: body.p_item, done_at: now, price_actual_cents: body.p_actual_cents ?? null },
      });
    }
    if (req.method() === 'POST') {
      const raw = req.postDataJSON() as Record<string, unknown> | Record<string, unknown>[];
      const rows = (Array.isArray(raw) ? raw : [raw]).map((r) => ({ created_at: now, updated_at: now, ...r }));
      const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return route.fulfill({ status: 201, json: single ? rows[0] : rows });
    }
    // Lecturas de refresco: no cambian nada (la cache ya tiene el estado optimista).
    return route.fulfill({ status: 503, json: { message: 'offline in e2e' } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
});

test('navega entre las 4 secciones', async ({ page }) => {
  await page.goto('/preview.html?screen=now');
  await expect(page.getByRole('heading', { name: 'Nuestra casa' })).toBeVisible();
  for (const [tab, heading] of [
    ['Pendientes', 'Pendientes'],
    ['Agenda', 'Agenda'],
    ['Presupuesto', 'Presupuesto'],
    ['Ahora', 'Nuestra casa'],
  ] as const) {
    await page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});

test('captura rápida crea una compra urgente con precio', async ({ page }) => {
  await page.goto('/preview.html?screen=items');
  const input = page.getByPlaceholder('Cuna $4500 !urgente @cuarto');
  await input.fill('Cuna $4,500 !urgente @"cuarto niños"');
  await expect(page.getByText('$4,500', { exact: true })).toBeVisible(); // chip de vista previa
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Marcar "Cuna" como hecho' })).toBeVisible();
  await expect(page.getByText('Compra · cuarto niños · $4,500')).toBeVisible();
  await expect(page.getByText('No se guardó')).toHaveCount(0);
});

test('completar una compra resta de la bolsa', async ({ page }) => {
  await page.goto('/preview.html?screen=items');
  await page.getByRole('button', { name: 'Marcar "Protectores de enchufes" como hecho' }).click();
  const confirm = page.getByRole('button', { name: 'Restar $350 de Bebé' });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(page.getByRole('button', { name: 'Marcar "Protectores de enchufes" como pendiente' })).toBeVisible();
  await expect(page.getByText('No se guardó')).toHaveCount(0);
});

test('Gasté $1,200 actualiza saldo y movimientos', async ({ page }) => {
  await page.goto('/preview.html?screen=budget');
  await expect(page.getByText('$38,450')).toBeVisible();
  await page.getByRole('button', { name: 'Gasté' }).click();
  await page.getByRole('button', { name: '+1,000' }).click(); // atajo suma
  await page.getByRole('button', { name: '+100' }).click();
  await page.getByRole('button', { name: '+100' }).click();
  await page.getByPlaceholder('¿En qué? (opcional)').fill('Pañales');
  await page.getByRole('button', { name: 'Restar $1,200' }).click();
  await expect(page.getByText('$37,250')).toBeVisible();
  await expect(page.getByText('Pañales')).toBeVisible();
  await expect(page.getByText('No se guardó')).toHaveCount(0);
});

test('el teclado concatena dígitos y borra', async ({ page }) => {
  await page.goto('/preview.html?screen=budget');
  await page.getByRole('button', { name: 'Agregué' }).click();
  for (const k of ['5', '0', '0', '0']) await page.getByRole('button', { name: k, exact: true }).click();
  await page.getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByRole('button', { name: 'Sumar $500' })).toBeVisible();
});

test('un guardado fallido se revierte y avisa', async ({ page }) => {
  await page.unroute('**/rest/v1/**');
  await page.route('**/rest/v1/**', (r) => r.fulfill({ status: 500, json: { message: 'boom' } }));
  await page.goto('/preview.html?screen=budget');
  await page.getByRole('button', { name: 'Agregué' }).click();
  await page.getByRole('button', { name: '+500' }).click();
  await page.getByRole('button', { name: 'Sumar $500' }).click();
  await expect(page.getByText('No se guardó. Revisa tu conexión.')).toBeVisible();
  await expect(page.getByText('$38,450')).toBeVisible();
});

test('agenda: crear evento para hoy', async ({ page }) => {
  await page.goto('/preview.html?screen=agenda');
  await page.getByRole('button', { name: /Agregar hoy/ }).click();
  await page.getByPlaceholder('Visita del plomero').fill('Comprar pañales');
  await page.getByLabel('Hora').fill('21:00');
  await page.getByRole('button', { name: 'Agregar a la agenda' }).click();
  await expect(page.getByRole('button', { name: /Comprar pañales/ }).first()).toBeVisible();
  await expect(page.getByText('No se guardó')).toHaveCount(0);
});
