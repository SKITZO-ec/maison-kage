// Modelo de producto con presentaciones, precios y stock por presentación
const { test, expect } = require('../soporte/fixtures');

test('precio con oferta solo en frasco', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => { const p = byId('khamrah');
    return [precioFinal(p, presOf(p, 'frasco', 50)), precioFinal(p, presOf(p, 'decant', 2))]; });
  expect(r).toEqual([27.2, 3.5]);
});

test('carrito con línea vieja no rompe', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => sessionStorage.setItem('mk-sesion', JSON.stringify({ cart: [
    { id: 'khamrah', kind: 'frasco', ml: 50, qty: 1 },
    { id: 'no-existe', kind: 'frasco', ml: 50, qty: 1 },
    { id: 'khamrah', kind: 'decant', ml: 7, qty: 1 }] })));
  await page.goto('carrito.html');
  await expect(page.locator('#app ul > li')).toHaveCount(1);
  expect(page.erroresConsola).toEqual([]);
});

test('agregar frasco respeta el stock de esa presentación', async ({ page }) => {
  await page.goto('producto.html?id=sauvage');
  const ok = await page.evaluate(() => [addToCart('sauvage', 'frasco', 50, 3, true), addToCart('sauvage', 'frasco', 50, 1, true)]);
  expect(ok).toEqual([true, false]);
});

test('precio desde y url del producto', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => [precioDesde(byId('khamrah')), urlProducto('khamrah'), urlProducto('khamrah', true)]);
  expect(r).toEqual([27.2, 'producto.html?id=khamrah', 'producto.html?id=khamrah&formato=decant']);
});

test('compra completa sigue funcionando', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await page.getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.goto('carrito.html');
  await expect(page.locator('#app')).toContainText('Khamrah');
  await expect(page.locator('#app')).toContainText('$27.20');
  expect(page.erroresConsola).toEqual([]);
});
