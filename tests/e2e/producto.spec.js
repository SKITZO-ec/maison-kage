// Ficha de producto, decants con un clic, presentaciones únicas y modo de uso en Ayuda
const { test, expect } = require('../soporte/fixtures');

test('decant con un clic y tope de 10', async ({ page }) => {
  await page.goto('producto.html?id=khamrah&formato=decant');
  const b = page.getByRole('button', { name: /Agregar 2 ml/ });
  for (let i = 0; i < 11; i++) if (await b.isEnabled()) await b.click();
  expect(await page.evaluate(() => state.cart.find(l => l.kind === 'decant' && l.ml === 2).qty)).toBe(10);
  await expect(b).toBeDisabled();
  await expect(page.locator('#app')).toContainText('Máximo 10 por tamaño');
});

test('la tarjeta de decant agrega con un clic', async ({ page }) => {
  await page.goto('catalogo.html?decant=1');
  await page.getByRole('button', { name: 'Agregar decant de 5 ml de Khamrah al carrito, $7.00' }).click();
  expect(await page.evaluate(() => enCarrito('khamrah', 'decant', 5))).toBe(1);
  await expect(page.locator('#cart-count')).toHaveText('1');
});

test('sin pestaña Modo de uso y FAQ en Ayuda', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByText('Modo de uso')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Descripción' })).toBeVisible();
  await page.goto('ayuda.html');
  await expect(page.getByText('¿Cómo aplicar un perfume para que dure más?')).toBeVisible();
  await expect(page.getByText('¿Cuánto dura cada concentración?')).toBeVisible();
});

test('id desconocido va a 404 y decant sin decants va al frasco', async ({ page }) => {
  await page.goto('producto.html?id=no-existe');
  await expect(page).toHaveURL(/404\.html/);
  await page.goto('index.html');
  const sinDecant = await page.evaluate(() => PRODUCTS.find(p => !decants(p).length).id);
  await page.goto(`producto.html?id=${sinDecant}&formato=decant`);
  await expect(page).not.toHaveURL(/formato=decant/);
});

test('una sola presentación no muestra selector', async ({ page }) => {
  await page.goto('index.html');
  const p = await page.evaluate(() => { const x = PRODUCTS.find(p => p.pres.length === 1); return { id: x.id, ml: x.pres[0].ml }; });
  await page.goto(`producto.html?id=${p.id}`);
  await expect(page.locator('input[name=pd-ml]')).toHaveCount(0);
  await expect(page.locator('#app')).toContainText(`Frasco ${p.ml} ml`);
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled();
});

test('similares priorizan la misma familia', async ({ page }) => {
  await page.goto('producto.html?id=libre');
  const ids = await page.locator('#h-rel ~ div article h3 a').evaluateAll(as => as.map(a => new URL(a.href).pathname.replace('/perfumes/', '')));
  expect(ids.length).toBe(4);
  expect(await page.evaluate(ids => ids.every(id => byId(id).familia === 'floral'), ids)).toBe(true);
  expect(ids).not.toContain('libre');
});

test('vistos recientemente en la ficha y en el inicio', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await page.goto('producto.html?id=asad');
  await expect(page.getByRole('heading', { name: 'Vistos recientemente' })).toBeVisible();
  await expect(page.locator('#vistos article')).toHaveCount(1);
  await page.goto('index.html');
  await expect(page.locator('#vistos article')).toHaveCount(2);
});
