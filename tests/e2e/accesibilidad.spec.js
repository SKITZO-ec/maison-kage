// Tamaños táctiles, foco visible bajo el encabezado fijo, sugerencias, 404 útil y puntos de ruptura
const { test, expect } = require('../soporte/fixtures');

test('objetivos táctiles de al menos 24 px', async ({ page }) => {
  for (const url of ['index.html', 'catalogo.html', 'producto.html?id=khamrah', 'producto.html?id=khamrah&formato=decant', 'carrito.html', 'login.html']) {
    await page.goto(url);
    const chicos = await page.evaluate(() => [...document.querySelectorAll('button, input, select, [role=button]')]
      .filter(el => el.offsetParent && !el.closest('p, li > span') && el.type !== 'hidden')
      .map(el => [el.outerHTML.slice(0, 90), (el.closest('label') || el).getBoundingClientRect()])
      .filter(([, r]) => r.width < 24 || r.height < 24).map(([h]) => h));
    expect(chicos, url).toEqual([]);
  }
});

test('el foco no queda debajo del encabezado', async ({ page }) => {
  await page.goto('catalogo.html');
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement, h = document.querySelector('header');
      if (!a || h.contains(a) || a === document.body || a.getAttribute('href') === '#main') return null;
      return [a.getBoundingClientRect().top, h.getBoundingClientRect().bottom, a.outerHTML.slice(0, 60)];
    });
    if (r) expect(r[0], r[2]).toBeGreaterThanOrEqual(r[1] - 1);
  }
});

test('el buscador sugiere perfumes y marcas', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('#q')).toHaveAttribute('list', 'sugerencias');
  const n = await page.locator('#sugerencias option').count();
  expect(n).toBeGreaterThan(70);
  await expect(page.locator('#sugerencias option[value="Khamrah"]')).toHaveCount(1);
});

test('404 con buscador y enlaces', async ({ page }) => {
  await page.goto('404.html');
  const main = page.getByRole('main');
  await expect(main.getByRole('combobox', { name: 'Busca un perfume, una marca o una nota' })).toBeVisible();
  for (const n of ['Ver todos los perfumes', 'Ofertas', 'Decants', 'Novedades', 'Ayuda y soporte']) await expect(main.getByRole('link', { name: n })).toBeVisible();
  await main.getByRole('combobox').fill('vainilla'); await main.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(/buscar\.html\?q=vainilla/);
});

test('animaciones reducidas cuando la persona lo pide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('index.html');
  const hay = await page.evaluate(() => [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(r => r.media && /prefers-reduced-motion/.test(r.media.mediaText)); } catch (e) { return false; } }));
  expect(hay).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe('120px');
});

test('sin desborde horizontal en ninguna página', async ({ page }) => {
  for (const url of ['index.html', 'catalogo.html', 'producto.html?id=khamrah', 'producto.html?id=khamrah&formato=decant', 'ayuda.html', 'login.html', 'registro.html', '404.html']) {
    await page.goto(url);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, url).toBeLessThanOrEqual(cw);
  }
});

test('en celular el encabezado no pasa de dos filas', async ({ page }, info) => {
  test.skip(info.project.name !== 'movil', 'solo celular');
  await page.goto('index.html');
  expect((await page.locator('header').first().boundingBox()).height).toBeLessThanOrEqual(130);
});
