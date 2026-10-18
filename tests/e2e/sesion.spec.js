// La sesión se pide solo al pagar o al guardar un favorito
const { test, expect } = require('../soporte/fixtures');

test('checkout sin sesión pide login y vuelve', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await page.evaluate(() => addToCart('khamrah', 'frasco', 50, 1, true));
  await page.goto('checkout.html');
  await expect(page).toHaveURL(/login\.html\?next=checkout\.html/);
  await expect(page.locator('#toast-region')).toContainText('Inicia sesión o crea una cuenta para terminar tu compra');
  await page.fill('#lg-email', 'ana@correo.com'); await page.fill('#lg-pass', 'clave1234');
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/checkout\.html/);
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
  await page.goto('producto.html?id=khamrah');
  await page.locator('#app [data-action=fav]').first().click();
  await page.getByRole('dialog').getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.fill('#lg-email', 'ana@correo.com'); await page.fill('#lg-pass', 'clave1234');
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/producto\.html\?id=khamrah/);
  await expect(page.locator('#toast-region')).toContainText('Khamrah se guardó en tus favoritos');
  expect(await page.evaluate(() => state.favs)).toEqual(['khamrah']);
});

test('con sesión el corazón guarda directo', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { state.accounts['a@b.com'] = newAccount('Ana', 'Ruiz', 'a@b.com'); state.user = 'a@b.com'; save(); });
  await page.goto('producto.html?id=asad');
  await page.locator('#app [data-action=fav]').first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => state.favs)).toEqual(['asad']);
});
