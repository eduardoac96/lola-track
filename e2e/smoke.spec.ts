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

test('login: contraseña incorrecta muestra error en español', async ({ page }) => {
  await page.route('**/auth/v1/token**', (r) =>
    r.fulfill({
      status: 400,
      json: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
    }),
  );
  await page.goto('/preview.html?screen=login');
  await page.getByLabel('Correo').fill('odin@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
});

test('login: crear cuenta exige 8 caracteres y avisa si falta desactivar Confirm email', async ({ page }) => {
  await page.route('**/auth/v1/signup**', (r) =>
    r.fulfill({ json: { id: 'u1', email: 'p@example.com', identities: [{ id: 'x' }] } }),
  );
  await page.goto('/preview.html?screen=login');
  await page.getByRole('radio', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Correo').fill('p@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('corta');
  const submit = page.getByRole('button', { name: 'Crear cuenta' }).last();
  await expect(submit).toBeDisabled();
  await page.getByLabel('Contraseña', { exact: true }).fill('suficiente123');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('Confirm email');
});

/** Arrastre horizontal con el mouse (Playwright no simula swipe táctil en Chromium de escritorio). */
async function swipeLeft(page: Page, locator: ReturnType<Page['locator']>) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const box = await locator.boundingBox();
  if (!box) throw new Error('sin caja');
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * 0.55; // lejos del botón + flotante
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 - i * 16, y);
  await page.mouse.up();
}

test.describe('mejoras v1.1', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('deslizar elimina un pendiente y Deshacer lo regresa', async ({ page }) => {
    await page.route('**/rest/v1/items*', (r) =>
      r.request().method() === 'DELETE' ? r.fulfill({ status: 204, body: '' }) : r.fallback(),
    );
    await page.goto('/preview.html?screen=items');
    const card = page.getByRole('button', { name: 'Marcar "Cambiador" como hecho' });
    await expect(card).toBeVisible();
    await swipeLeft(page, page.getByLabel(/^Cambiador\. Desliza/));
    await expect(card).toHaveCount(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(card).toBeVisible();
    await expect(page.getByText('No se guardó')).toHaveCount(0);
  });

  test('ya no hay pestaña de Arreglos y Tareas incluye arreglos', async ({ page }) => {
    await page.goto('/preview.html?screen=items');
    const filtros = page.getByRole('radiogroup', { name: 'Filtrar por tipo' });
    await expect(filtros.getByRole('radio')).toHaveText(['Todo', 'Compras', 'Tareas']);
    await filtros.getByRole('radio', { name: 'Tareas' }).click();
    await expect(page.getByText('Asegurar muebles a la pared')).toBeVisible(); // es un arreglo
    await expect(page.getByText('Lámpara de noche')).toHaveCount(0); // es compra
  });

  test('reordenar con teclado mueve el pendiente', async ({ page }) => {
    await page.route('**/rest/v1/items*', (r) =>
      r.request().method() === 'PATCH'
        ? r.fulfill({
            json: {
              id: new URL(r.request().url()).searchParams.get('id')?.replace('eq.', ''),
              ...(r.request().postDataJSON() as object),
            },
          })
        : r.fallback(),
    );
    await page.goto('/preview.html?screen=items');
    const urgentes = page.locator('section').filter({ has: page.getByRole('heading', { name: /Urgente/ }) });
    const titles = () => urgentes.locator('.truncate.text-\\[15px\\]').allInnerTexts();
    const before = await titles();
    const handle = page.getByRole('button', { name: `Reordenar "${before[0]}"` });
    await handle.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
    await page.keyboard.press('Space');
    await expect.poll(titles).toEqual([before[1], before[0], ...before.slice(2)]);
  });

  test('toggle día/noche cambia el tema y se recuerda', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/preview.html?screen=now');
    await page.getByRole('button', { name: 'Cambiar a modo noche' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Cambiar a modo día' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('editar movimiento y eliminar bolsa con confirmación', async ({ page }) => {
    await page.route('**/rest/v1/budget_movements*', (r) =>
      r.request().method() === 'PATCH'
        ? r.fulfill({ json: { ...(r.request().postDataJSON() as object), id: 'm4', budget_id: 'b-bebe' } })
        : r.fallback(),
    );
    await page.route('**/rest/v1/budgets*', (r) =>
      r.request().method() === 'DELETE' ? r.fulfill({ status: 204, body: '' }) : r.fallback(),
    );
    await page.goto('/preview.html?screen=budget');
    await page.getByRole('button', { name: /Pintura cuarto/ }).click();
    const monto = page.getByLabel('Monto', { exact: true });
    await monto.fill('2000');
    await page.getByRole('button', { name: 'Guardar −$2,000' }).click();
    await expect(page.getByText('$38,300')).toBeVisible(); // $38,450 − $150 de diferencia
    await page.getByRole('button', { name: 'Editar o eliminar la bolsa Bebé' }).click();
    await page.getByRole('button', { name: 'Eliminar bolsa' }).click();
    await expect(page.getByText(/No se puede deshacer/)).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar definitivamente' }).click();
    await expect(page.getByText('Disponible en Arreglos casa')).toBeVisible();
    await expect(page.getByText('No se guardó')).toHaveCount(0);
  });
});
