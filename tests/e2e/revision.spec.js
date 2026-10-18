// Pruebas de los hallazgos de la revisión final
const { test, expect } = require('../soporte/fixtures');

async function conCuentaYCarrito(page, lineas = [['khamrah', 'frasco', 50, 2]]) {
  await page.goto('index.html');
  await page.evaluate(ls => { state.accounts['a@b.com'] = newAccount('Ana', 'Ruiz', 'a@b.com'); state.user = 'a@b.com'; ls.forEach(l => addToCart(...l, true)); save(); }, lineas);
}

for (const w of [320, 375, 800, 1024]) test(`encabezado con carrito lleno en ${w} px`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await conCuentaYCarrito(page);
  for (const url of ['index.html', 'catalogo.html', 'producto.html?id=khamrah']) {
    await page.goto(url);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, url).toBeLessThanOrEqual(cw);
    const b = await page.locator('#cart-link').boundingBox();
    expect(b.x + b.width, url).toBeLessThanOrEqual(cw);
    if (w >= 375 && w <= 767) expect((await page.locator('header').first().boundingBox()).height, url).toBeLessThanOrEqual(130);
  }
});

for (const w of [375, 800]) test(`con Shift+Tab el foco no queda bajo el encabezado en ${w} px`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 700 });
  await conCuentaYCarrito(page);
  await page.goto('producto.html?id=khamrah');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(100);
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Shift+Tab');
    const r = await page.evaluate(() => {
      const a = document.activeElement, h = document.querySelector('header');
      if (!a || h.contains(a) || a === document.body || a.getAttribute('href') === '#main') return null;
      return [a.getBoundingClientRect().top, h.getBoundingClientRect().bottom, a.outerHTML.slice(0, 60)];
    });
    if (r) expect(r[0], r[2]).toBeGreaterThanOrEqual(r[1] - 1);
  }
});

test('quitar del carrito deja el foco en Deshacer y funciona con teclado', async ({ page }) => {
  await conCuentaYCarrito(page, [['asad', 'frasco', 50, 1], ['khamrah', 'frasco', 50, 2]]);
  await page.goto('carrito.html');
  await page.getByRole('button', { name: /Quitar Khamrah/ }).focus();
  await page.keyboard.press('Enter');
  const deshacer = page.getByRole('button', { name: /Deshacer/ });
  await expect(deshacer).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => state.cart.map(l => [l.id, l.qty]))).toEqual([['asad', 1], ['khamrah', 2]]);
});

test('quitar el último producto no pierde el foco', async ({ page }) => {
  await conCuentaYCarrito(page);
  await page.goto('carrito.html');
  await page.getByRole('button', { name: /Quitar Khamrah/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Deshacer/ })).toBeFocused();
  await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
});

test('el aviso del corazón se cierra al salir con Tab o Shift+Tab', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  const corazon = page.locator('#app [data-action=fav]').first();
  await corazon.focus(); await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(corazon).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(corazon).toBeFocused();
});

test('el botón de decant no pierde el foco al llegar al máximo', async ({ page }) => {
  await page.goto('producto.html?id=khamrah&formato=decant');
  const b = page.getByRole('button', { name: /Agregar 2 ml/ });
  await b.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('Enter');
  await expect(b).toBeFocused();
  await expect(b).toBeDisabled();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => enCarrito('khamrah', 'decant', 2))).toBe(10);
});

test('agregar la última unidad no pierde el foco', async ({ page }) => {
  await page.goto('producto.html?id=sauvage');
  await page.evaluate(() => addToCart('sauvage', 'frasco', 50, 2, true));
  await page.reload();
  const b = page.getByRole('button', { name: 'Agregar al carrito' });
  await b.focus(); await page.keyboard.press('Enter');
  await expect(b).toBeFocused();
  await expect(b).toBeDisabled();
});

test('un pedido con otro correo aparece en Mis pedidos', async ({ page }) => {
  await conCuentaYCarrito(page, [['khamrah', 'frasco', 50, 1]]);
  await page.goto('checkout.html');
  await page.fill('#co-email', 'otro@correo.com'); await page.fill('#co-tel', '0991234567');
  await page.selectOption('#co-ciudad', 'Quito'); await page.fill('#co-dir', 'Av. Amazonas');
  await page.check('input[value=Deuna]');
  await page.click('#co-submit');
  await page.click('#gw-late');
  await page.waitForURL(/confirmacion/);
  await page.goto('pedidos.html');
  await expect(page.locator('#orders article')).toHaveCount(1);
});

test('el carrito corrige cantidades inválidas', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => sessionStorage.setItem('mk-sesion', JSON.stringify({ cart: [
    { id: 'khamrah', kind: 'frasco', ml: 50, qty: 99 }, { id: 'khamrah', kind: 'decant', ml: 2, qty: 50 },
    { id: 'asad', kind: 'frasco', ml: 50, qty: '2' }, { id: 'yara', kind: 'frasco', ml: 50, qty: -1 }] })));
  await page.goto('carrito.html');
  expect(await page.evaluate(() => state.cart.map(l => [l.id, l.kind, l.qty]))).toEqual([['khamrah', 'frasco', 6], ['khamrah', 'decant', 10], ['asad', 'frasco', 2]]);
  await expect(page.locator('#cart-count')).toHaveText('18');
});

test('el enlace al modo de uso abre la pregunta', async ({ page }) => {
  await page.goto('ayuda.html#modo-uso');
  await expect(page.locator('#modo-uso')).toHaveAttribute('open', '');
});

test('en 320 px las tarjetas no desbordan', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const url of ['index.html', 'catalogo.html', 'catalogo.html?decant=1', 'carrito.html']) {
    await page.goto(url);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw, url).toBeLessThanOrEqual(cw);
  }
});

test('el texto de Decants coincide con agregar desde la tarjeta', async ({ page }) => {
  await page.goto('catalogo.html?decant=1');
  await expect(page.locator('header p').first()).not.toContainText('luego el tamaño en su ficha');
  await expect(page.locator('#app')).toContainText('Toca un tamaño para agregarlo a tu carrito');
});

test('la confirmación en verificación avisa del correo', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { state.accounts['a@b.com'] = newAccount('Ana', 'Ruiz', 'a@b.com'); state.user = 'a@b.com';
    state.lastOrder = { num: 'MK-1002', fecha: '18 oct 2026', estado: 'Pago en verificación', metodo: 'Deuna', items: [{ nombre: 'Asad', desc: 'Frasco 50 ml', qty: 1, unit: 26 }],
      total: 29.5, email: 'a@b.com', entrega: 'envio', guia: null, envio: { nombre: 'Ana Ruiz', dir: 'Av. Amazonas', ciudad: 'Quito', tel: '0991234567' } }; save(); });
  await page.goto('confirmacion.html');
  await expect(page.locator('#app')).toContainText('Te enviamos la confirmación del pedido a a@b.com.');
});
