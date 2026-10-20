// Cada página del sitio carga con su encabezado y sin errores de JavaScript
const { test, expect } = require('../soporte/fixtures');

const PAGINAS = ['index','catalogo','buscar','producto','carrito','checkout','confirmacion','login','registro','recuperar','perfil','direcciones','favoritos','pedidos','ayuda','404'];

for (const p of PAGINAS) test(`${p} carga sin errores`, async ({ page }) => {
  await page.goto(`${p}.html${p === 'producto' ? '?id=khamrah' : ''}`);
  await expect(page.locator('header').first()).toBeVisible();
  expect(page.erroresConsola).toEqual([]);
});

test('el CSS de Tailwind se aplica', async ({ page }) => {
  await page.goto('index.html');
  const fondo = await page.locator('header').first().evaluate(el => getComputedStyle(el).backgroundColor);
  expect(fondo).toBe('rgb(18, 28, 43)');
});

for (const url of ['catalogo.html?decant=1', 'catalogo.html?familia=gourmand&origen=arabe', 'producto.html?id=khamrah&formato=decant', 'buscar.html?q=vainilla'])
  test(`${url} carga sin errores`, async ({ page }) => {
    await page.goto(url);
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(page.erroresConsola).toEqual([]);
  });

test('checkout con carrito carga sin errores', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { state.accounts['a@b.com'] = newAccount('Ana','Ruiz','a@b.com'); state.user = 'a@b.com'; addToCart('khamrah','frasco',50,1,true); addToCart('khamrah','decant',5,2,true); });
  await page.goto('checkout.html');
  await expect(page.locator('#co-form')).toBeVisible();
  expect(page.erroresConsola).toEqual([]);
});

test('el logo y las imágenes cargan', async ({ page }) => {
  const fallidas = [];
  // Las fotos de los perfumes llegan en la Fase 3
  page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/img/productos/')) fallidas.push(r.url()); });
  await page.goto('index.html');
  await page.waitForLoadState('load');
  expect(await page.locator('header img').first().evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  expect(fallidas).toEqual([]);
});
