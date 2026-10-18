// Menú Perfumes sin el apartado Catálogo, botón del carrito visible y pie con el local
const { test, expect } = require('../soporte/fixtures');

test('no existe el enlace Catálogo y Perfumes tiene Ver todos', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('header a', { hasText: /^\s*Catálogo/ })).toHaveCount(0);
  await expect(page.locator('footer a', { hasText: /^\s*Catálogo\s*$/ })).toHaveCount(0);
  await expect(page.locator('#mega a[href="catalogo.html"]', { hasText: 'Ver todos los perfumes' })).toHaveCount(1);
});

test('el menú Perfumes agrupa por público, origen, familia y ocasión', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'el panel grande es de escritorio');
  await page.goto('index.html');
  await page.locator('#btn-perfumes').click();
  for (const g of ['Por público', 'Por origen', 'Familia olfativa', 'Ocasión', 'Destacados']) await expect(page.locator('#mega')).toContainText(g);
  await expect(page.locator('#mega a[href="catalogo.html?familia=cuero"]')).toHaveCount(1);
});

test('en móvil el menú agrupa las categorías en desplegables', async ({ page }, info) => {
  test.skip(info.project.name === 'escritorio', 'menú compacto');
  await page.goto('index.html');
  await page.locator('#btn-menu').click();
  await expect(page.locator('#dd-menu details')).toHaveCount(4);
  await expect(page.locator('#dd-menu summary').first()).toHaveText('Por público');
  await expect(page.locator('#dd-menu a[href="catalogo.html"]', { hasText: 'Ver todos los perfumes' })).toBeVisible();
});

test('filtro por familia muestra 10', async ({ page }) => {
  await page.goto('catalogo.html?familia=floral');
  await expect(page.locator('#cat-count')).toHaveText('10 perfumes de 70');
  await expect(page.locator('nav[aria-label="Migas de pan"]')).toContainText('Perfumes');
});

test('botón del carrito con texto y contador', async ({ page }) => {
  await page.goto('index.html');
  const b = page.locator('#cart-link');
  await expect(b).toContainText('Carrito');
  expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => addToCart('khamrah', 'frasco', 50, 2, true));
  await expect(page.locator('#cart-count')).toHaveText('2');
});

test('pie con ubicación del local', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('footer')).toContainText('Av. República de El Salvador N34-127 y Suiza, Quito');
  await expect(page.locator('footer a', { hasText: 'Ver en el mapa' })).toHaveAttribute('href', /google\.com\/maps/);
});

test('el inicio muestra ofertas, novedades y más vendidos', async ({ page }) => {
  await page.goto('index.html');
  for (const id of ['#home-ofertas', '#home-novedades', '#home-top']) await expect(page.locator(id + ' article')).toHaveCount(4);
});
