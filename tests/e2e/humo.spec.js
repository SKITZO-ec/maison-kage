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

test.describe('si la base falla', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/js/productos.js', r => r.fulfill({ body: 'const PRODUCTS = null;', contentType: 'text/javascript' }));
  });

  // Las 14 páginas con script propio, con sesión iniciada para que ninguna redirija
  const CON_SCRIPT = ['index', 'catalogo', 'buscar', 'producto.html?id=khamrah', 'carrito', 'checkout', 'confirmacion', 'login', 'registro', 'recuperar', 'perfil', 'direcciones', 'favoritos', 'pedidos'];
  for (const p of CON_SCRIPT) {
    const url = p.includes('.html') ? p : `${p}.html`;
    test(`${url} muestra el aviso con Reintentar y no da errores`, async ({ page }) => {
      await cuentaNueva(page);
      await page.goto(url);
      await expect(page.locator('#app [role="alert"]')).toContainText('No pudimos cargar los perfumes');
      await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('footer').first()).toBeVisible();
      expect(page.erroresConsola).toEqual([]);
    });
  }

  test('el favorito pendiente no se pierde mientras el catálogo está caído', async ({ page }) => {
    await cuentaNueva(page);
    await page.goto('login.html');
    await page.evaluate(() => sessionStorage.setItem('mk-fav-pendiente', 'khamrah'));
    await page.goto('index.html');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('mk-fav-pendiente'))).toBe('khamrah');
    expect(page.erroresConsola).toEqual([]);
  });

  test('Reintentar se alcanza con Tab y vuelve a cargar la página', async ({ page }) => {
    await page.goto('index.html');
    const boton = page.getByRole('button', { name: 'Reintentar' });
    await expect(boton).toBeVisible();
    let enfocado = false;
    for (let i = 0; i < 40 && !enfocado; i++) {
      await page.keyboard.press('Tab');
      enfocado = await boton.evaluate(el => el === document.activeElement);
    }
    expect(enfocado).toBe(true);
    // La base ya responde, el segundo intento deja pasar la petición real
    await page.unroute('**/js/productos.js');
    await page.keyboard.press('Enter');
    await expect(page.locator('#home-ofertas a').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    expect(page.erroresConsola).toEqual([]);
  });

  test('el buscador y el menú del encabezado siguen funcionando', async ({ page }) => {
    await page.goto('index.html');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await page.locator('#q').fill('oud');
    await page.locator('#q').press('Enter');
    await expect(page).toHaveURL(/buscar\.html\?q=oud/);
  });
});
