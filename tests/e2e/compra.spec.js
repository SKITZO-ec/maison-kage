// Aviso de envío gratis, quitar con deshacer y confirmación del pedido
const { test, expect } = require('../soporte/fixtures');

const PEDIDO = { num: 'MK-1001', fecha: '18 oct 2026', estado: 'En preparación', metodo: 'Tarjeta', items: [{ nombre: 'Khamrah', desc: 'Frasco 50 ml', qty: 1, unit: 27.2 }],
  total: 30.7, email: 'a@b.com', entrega: 'envio', guia: '426896023910', envio: { nombre: 'Ana Ruiz', dir: 'Av. Amazonas', ciudad: 'Quito', tel: '0991234567' } };

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
  await page.goto('index.html');
  await page.evaluate(o => { state.accounts['a@b.com'] = newAccount('Ana', 'Ruiz', 'a@b.com'); state.user = 'a@b.com'; state.lastOrder = o; save(); }, PEDIDO);
  await page.goto('confirmacion.html');
  await expect(page.getByText('Crear cuenta para seguir tu pedido')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver mis pedidos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Seguir comprando' })).toBeVisible();
  for (const t of ['Copia tu número de guía con el botón Copiar.', 'Abre la página de rastreo de Servientrega.', 'Pega el número y consulta dónde está tu pedido.'])
    await expect(page.locator('ol li', { hasText: t })).toBeVisible();
  await expect(page.locator('#app')).toContainText('Te enviamos la confirmación del pedido a a@b.com.');
});
