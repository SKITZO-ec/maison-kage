// La sesión se pide solo al pagar o al guardar un favorito
const { test, expect, cuentaNueva } = require('../soporte/fixtures');

test('checkout sin sesión pide login y vuelve', async ({ page }) => {
  const { correo, clave } = await cuentaNueva(page, { sesion: false });
  await page.goto('producto.html?id=khamrah');
  await page.evaluate(() => addToCart('khamrah', 'frasco', 50, 1, true));
  await page.goto('checkout.html');
  await expect(page).toHaveURL(/login\.html\?next=checkout\.html/);
  await expect(page.locator('#toast-region')).toContainText('Inicia sesión o crea una cuenta para terminar tu compra');
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', clave);
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/\/checkout\.html$/);
  await expect(page.locator('#app')).not.toContainText('invitado');
});

test('next externo o con código va a perfil', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => [safeNext('https://malo.com'), safeNext('javascript:alert(1)'), safeNext('//malo.com/x.html'), safeNext('producto.html?id=khamrah'), safeNext('')]);
  expect(r).toEqual(['perfil.html', 'perfil.html', 'perfil.html', 'producto.html?id=khamrah', 'perfil.html']);
});

test('login y registro conservan el destino entre sí', async ({ page }) => {
  await page.goto('login.html?next=' + encodeURIComponent('producto.html?id=asad'));
  await expect(page.locator('#lg-reg')).toHaveAttribute('href', 'registro.html?next=' + encodeURIComponent('producto.html?id=asad'));
  await page.goto('registro.html?next=checkout.html');
  await expect(page.locator('a[href^="login.html"]').last()).toHaveAttribute('href', 'login.html?next=checkout.html');
});

test('aviso del corazón con teclado', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  const corazon = page.locator('#app [data-action=fav]').first();
  await corazon.focus(); await page.keyboard.press('Enter');
  const aviso = page.getByRole('dialog', { name: /favoritos/i });
  await expect(aviso).toBeVisible();
  await expect(aviso.getByRole('link', { name: 'Crear cuenta' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(aviso).toBeHidden();
  await expect(corazon).toBeFocused();
  expect(await page.evaluate(() => state.favs.length)).toBe(0);
});

test('el aviso del corazón se cierra con clic afuera', async ({ page }) => {
  await page.goto('catalogo.html');
  await page.locator('#app [data-action=fav]').first().click();
  await expect(page.getByRole('dialog', { name: /favoritos/i })).toBeVisible();
  await page.locator('h1').click();
  await expect(page.getByRole('dialog', { name: /favoritos/i })).toBeHidden();
});

test('favorito pendiente se guarda al iniciar sesión', async ({ page }) => {
  const { correo, clave } = await cuentaNueva(page, { sesion: false });
  await page.goto('producto.html?id=khamrah');
  await page.locator('#app [data-action=fav]').first().click();
  await page.getByRole('dialog').getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', clave);
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/producto\.html\?id=khamrah/);
  await expect(page.locator('#toast-region')).toContainText('Khamrah se guardó en tus favoritos');
  expect(await page.evaluate(() => state.favs)).toEqual(['khamrah']);
  await expect(page.locator('#app [data-action=fav]').first()).toHaveAttribute('aria-pressed', 'true');
  // Quedó guardado en el servidor, no solo en la pestaña
  expect(await (await page.request.get('/api/favoritos')).json()).toEqual(['khamrah']);
});

test('con sesión el corazón guarda directo', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('producto.html?id=asad');
  await page.locator('#app [data-action=fav]').first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => state.favs)).toEqual(['asad']);
});

test('crear cuenta desde registro deja la sesión abierta al recargar', async ({ page }) => {
  const correo = `ana+${Date.now()}${Math.random().toString(16).slice(2, 8)}@correo.com`;
  await page.goto('registro.html');
  await page.fill('#rg-nombre', 'Ana Ruiz'); await page.fill('#rg-email', correo); await page.fill('#rg-tel', '0991234567');
  await page.fill('#rg-pass', 'clave1234'); await page.fill('#rg-pass2', 'clave1234');
  await page.click('#rg-form button[type=submit]');
  await expect(page).toHaveURL(/perfil\.html/);
  await expect(page.locator('#toast-region')).toContainText('Cuenta creada. Bienvenido a Maison Kage.');
  await expect(page.locator('#dd-account')).toContainText('Hola, Ana');
  await page.reload();
  await expect(page.locator('#dd-account')).toContainText('Hola, Ana');
  await expect(page.locator('#pf-email')).toHaveValue(correo);
});

test('registrar un correo que ya tiene cuenta avisa en el campo', async ({ page }) => {
  const { correo } = await cuentaNueva(page, { sesion: false });
  await page.goto('registro.html');
  await page.fill('#rg-nombre', 'Ana Ruiz'); await page.fill('#rg-email', correo); await page.fill('#rg-tel', '0991234567');
  await page.fill('#rg-pass', 'clave1234'); await page.fill('#rg-pass2', 'clave1234');
  await page.click('#rg-form button[type=submit]');
  await expect(page.locator('#err-rg-email')).toHaveText('Ya existe una cuenta con este correo. Inicia sesión.');
  await expect(page).toHaveURL(/registro\.html/);
});

test('login con clave equivocada o correo sin cuenta muestra el mismo error', async ({ page }) => {
  const { correo } = await cuentaNueva(page, { sesion: false });
  await page.goto('login.html');
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', 'otra-clave');
  await page.click('#lg-form button[type=submit]');
  await expect(page.locator('#err-lg-pass')).toHaveText('El correo o la contraseña no son correctos.');
  // El login ya no crea cuentas
  await page.fill('#lg-email', 'nadie+' + Date.now() + '@correo.com'); await page.fill('#lg-pass', 'clave1234');
  await page.click('#lg-form button[type=submit]');
  await expect(page.locator('#err-lg-pass')).toHaveText('El correo o la contraseña no son correctos.');
  await expect(page).toHaveURL(/login\.html/);
  await expect(page.locator('#lg-reg')).toBeVisible();
  expect(await (await page.request.get('/api/yo')).json()).toBeNull();
});

test('el favorito guardado aparece marcado en otra pestaña', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('producto.html?id=asad');
  const guardado = page.waitForResponse(r => r.url().endsWith('/api/favoritos/asad') && r.request().method() === 'PUT');
  await page.locator('#app [data-action=fav]').first().click();
  expect((await guardado).ok()).toBe(true);
  const otra = await page.context().newPage();
  await otra.goto('producto.html?id=asad');
  await expect(otra.locator('#app [data-action=fav]').first()).toHaveAttribute('aria-pressed', 'true');
  await otra.goto('favoritos.html');
  await expect(otra.locator('#favs')).toContainText('1 perfume guardado');
  await otra.close();
});

test('si la API falla el corazón vuelve como estaba', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('producto.html?id=asad');
  await page.route('**/api/favoritos/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.' }) }));
  const corazon = page.locator('#app [data-action=fav]').first();
  await corazon.click();
  await expect(page.locator('#toast-region')).toContainText('No pudimos conectarnos con la base de datos.');
  await expect(corazon).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => state.favs)).toEqual([]);
});

test('cerrar sesión desde el menú y recargar deja la cuenta sin sesión', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('index.html');
  await expect(page.locator('#dd-account')).toContainText('Hola, Ana');
  await page.click('#btn-account');
  await page.locator('#dd-account').getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.locator('#toast-region')).toContainText('Cerraste sesión correctamente.');
  await page.reload();
  await expect(page.locator('#dd-account')).toContainText('Bienvenido a Maison Kage');
  expect(await (await page.request.get('/api/yo')).json()).toBeNull();
});
