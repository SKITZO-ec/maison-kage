// Cada página del sitio carga con su encabezado y sin errores de JavaScript
const { test, expect, cuentaNueva, carritoCon } = require('../soporte/fixtures');

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
  await cuentaNueva(page);
  await carritoCon(page, [['khamrah', 'frasco', 50, 1], ['khamrah', 'decant', 5, 2]]);
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

test('la política de seguridad no bloquea nada y las fotos que faltan se quitan', async ({ page }) => {
  const csp = [];
  page.on('console', m => { if (/content security policy|refused to/i.test(m.text())) csp.push(m.text()); });
  const r = await page.goto('catalogo.html');
  expect(r.headers()['content-security-policy']).toContain("script-src 'self' https://cdn.tailwindcss.com");
  await expect(page.locator('#app')).not.toBeEmpty();
  // Las fotos de los perfumes llegan en la Fase 3, las que ya intentaron cargar y fallaron deben haberse quitado
  await expect.poll(() => page.locator('img[data-foto]').evaluateAll(l => l.filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc).length)).toBe(0);
  await page.goto('index.html');
  await page.waitForLoadState('load');
  expect(csp).toEqual([]);
  expect(page.erroresConsola).toEqual([]);
});
