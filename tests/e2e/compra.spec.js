// Aviso de envío gratis, quitar con deshacer y confirmación del pedido
const { test, expect, cuentaNueva, carritoCon, pedidoNuevo } = require('../soporte/fixtures');

test('aviso de envío gratis desde 60', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => addToCart('sauvage', 'frasco', 50, 1, true));
  await page.goto('carrito.html');
  await expect(page.getByText('Tu envío es gratis porque tu compra llega a $60.00. Recuerda que el envío gratis aplica solo en compras desde $60.00.')).toBeVisible();
});

test('debajo de 60 se indica cuánto falta', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => addToCart('khamrah', 'frasco', 50, 1, true));
  await page.goto('carrito.html');
  await expect(page.getByText('Te faltan $32.80 para el envío gratis')).toBeVisible();
  await expect(page.getByText('Tu envío es gratis')).toHaveCount(0);
});

test('quitar y deshacer', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { addToCart('asad', 'frasco', 50, 1, true); addToCart('khamrah', 'frasco', 50, 2, true); });
  await page.goto('carrito.html');
  await page.getByRole('button', { name: /Quitar Khamrah/ }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Deshacer/ })).toBeFocused();
  expect(await page.evaluate(() => state.cart.length)).toBe(1);
  await page.getByRole('button', { name: /Deshacer/ }).click();
  expect(await page.evaluate(() => state.cart.map(l => [l.id, l.qty]))).toEqual([['asad', 1], ['khamrah', 2]]);
  await expect(page.locator('#app ul > li')).toHaveCount(2);
});

test('confirmación sin crear cuenta y con pasos de la guía', async ({ page }) => {
  await cuentaNueva(page);
  /* Las compras de las pruebas son de decants de 5 ml de Asad, que tiene stock de sobra */
  await carritoCon(page, [['asad', 'decant', 5, 1]]);
  const o = await pedidoNuevo(page);
  await page.goto('confirmacion.html?n=' + o.num);
  await expect(page.getByText('Crear cuenta para seguir tu pedido')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver mis pedidos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Seguir comprando' })).toBeVisible();
  for (const t of ['Copia tu número de guía con el botón Copiar.', 'Abre la página de rastreo de Servientrega.', 'Pega el número y consulta dónde está tu pedido.'])
    await expect(page.locator('ol li', { hasText: t })).toBeVisible();
  await expect(page.locator('#app')).toContainText('Te enviamos la confirmación del pedido a a@b.com.');
});
