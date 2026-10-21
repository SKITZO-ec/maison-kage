// Campos con límites (celular de 10 dígitos, tarjeta de 16), registro y perfil
const { test, expect, cuentaNueva, salir, carritoCon } = require('../soporte/fixtures');

async function conCuenta(page) {
  await cuentaNueva(page);
  await page.goto('index.html');
}
const correoUnico = () => `ana+${Date.now()}${Math.random().toString(16).slice(2, 8)}@correo.com`;
const pegar = (loc, texto) => loc.evaluate((el, t) => { el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', t);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, texto);

test('funciones de límite de dígitos y tarjeta', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => [formatCard('4111-1111-1111-1111 9999'), soloDigitos('09912345678', 10), soloDigitos('+593 99', 10)]);
  expect(r).toEqual(['4111 1111 1111 1111', '0991234567', '59399']);
});

test('pegar y escribir en el celular deja solo 10 dígitos', async ({ page }) => {
  await conCuenta(page);
  await page.goto('perfil.html');
  const tel = page.locator('#pf-tel');
  await tel.fill('');
  await pegar(tel, '099 123 4567');
  await expect(tel).toHaveValue('0991234567');
  await tel.fill(''); await tel.pressSequentially('09912345678abc');
  await expect(tel).toHaveValue('0991234567');
});

test('todos los celulares tienen el límite', async ({ page }) => {
  await conCuenta(page);
  for (const [url, id] of [['perfil.html', '#pf-tel'], ['direcciones.html', '#ad-tel'], ['registro.html', '#rg-tel']]) {
    await page.goto(url);
    await expect(page.locator(id)).toHaveAttribute('maxlength', '10');
    await expect(page.locator(id)).toHaveAttribute('data-digits', '10');
  }
});

test('la tarjeta no pasa de 16 dígitos', async ({ page }) => {
  await conCuenta(page);
  await carritoCon(page, [['khamrah', 'frasco', 50, 1]]);
  await page.goto('checkout.html');
  await expect(page.locator('#co-tel')).toHaveAttribute('data-digits', '10');
  await page.fill('#co-tel', '0991234567'); await page.selectOption('#co-ciudad', 'Quito'); await page.fill('#co-dir', 'Av. Amazonas y Colón');
  await page.click('#co-submit');
  const num = page.locator('#cd-num');
  await pegar(num, '4111-1111-1111-1111 9999');
  await expect(num).toHaveValue('4111 1111 1111 1111');
});

test('registro pide celular y la contraseña no queda en el navegador', async ({ page }) => {
  const correo = correoUnico();
  await page.goto('registro.html');
  await page.fill('#rg-nombre', 'Ana Ruiz'); await page.fill('#rg-email', correo);
  await page.fill('#rg-pass', 'clave1234'); await page.fill('#rg-pass2', 'clave1234');
  await page.click('#rg-form button[type=submit]');
  await expect(page.locator('#rg-errors')).toBeVisible();
  await expect(page.locator('#err-rg-tel')).toBeVisible();
  await page.fill('#rg-tel', '0991234567'); await page.click('#rg-form button[type=submit]');
  await expect(page).toHaveURL(/perfil\.html/);
  await page.waitForLoadState('load');
  const u = await page.evaluate(() => currentUser());
  expect(u.email).toBe(correo);
  expect(u.tel).toBe('0991234567');
  expect(JSON.stringify(u)).not.toContain('clave1234');
  // La contraseña la guarda el servidor, en la pestaña no queda nada de ella
  expect(await page.evaluate(() => JSON.stringify(sessionStorage) + document.cookie)).not.toContain('clave1234');
});

async function registrar(page) {
  const correo = correoUnico();
  await page.goto('registro.html');
  await page.fill('#rg-nombre', 'Ana Ruiz'); await page.fill('#rg-email', correo); await page.fill('#rg-tel', '0991234567');
  await page.fill('#rg-pass', 'clave1234'); await page.fill('#rg-pass2', 'clave1234'); await page.click('#rg-form button[type=submit]');
  await expect(page).toHaveURL(/perfil\.html/);
  await expect(page.locator('#pf-email')).toHaveValue(correo);
  return correo;
}

test('cambiar correo exige contraseña actual', async ({ page }) => {
  await registrar(page);
  const nuevo = correoUnico();
  await page.fill('#pf-email', nuevo);
  await expect(page.locator('#pf-pass')).toBeVisible();
  await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#err-pf-pass')).toBeVisible();
  await page.fill('#pf-pass', 'otra-clave'); await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#err-pf-pass')).toHaveText('La contraseña actual no es correcta.');
  await page.fill('#pf-pass', 'clave1234'); await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#toast-region')).toContainText('Cambios guardados');
  expect(await page.evaluate(() => state.user)).toBe(nuevo);
  await page.reload();
  await expect(page.locator('#pf-email')).toHaveValue(nuevo);
});

test('cambiar contraseña y luego iniciar sesión con la nueva', async ({ page }) => {
  const correo = await registrar(page);
  await page.fill('#pw-actual', 'mala-clave'); await page.fill('#pw-nueva', 'nueva12345'); await page.fill('#pw-nueva2', 'nueva12345');
  await page.click('#pw-form button[type=submit]');
  await expect(page.locator('#err-pw-actual')).toHaveText('La contraseña actual no es correcta.');
  await page.fill('#pw-actual', 'clave1234'); await page.click('#pw-form button[type=submit]');
  await expect(page.locator('#toast-region')).toContainText('Contraseña actualizada');
  await salir(page);
  await page.goto('login.html');
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', 'clave1234'); await page.click('#lg-form button[type=submit]');
  await expect(page.locator('#err-lg-pass')).toHaveText('El correo o la contraseña no son correctos.');
  await page.fill('#lg-pass', 'nueva12345'); await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/perfil\.html/);
});
