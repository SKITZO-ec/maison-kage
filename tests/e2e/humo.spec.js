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
