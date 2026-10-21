// Perfil, direcciones y recuperar contraseña conectados a la API
const { test, expect, cuentaNueva, salir } = require('../soporte/fixtures');

async function agregarDireccion(page, alias, dir) {
  await page.click('#ad-toggle');
  await page.fill('#ad-alias', alias);
  await page.selectOption('#ad-ciudad', 'Quito');
  await page.fill('#ad-dir', dir);
  await page.fill('#ad-tel', '0991234567');
  await page.click('#ad-form button[type=submit]');
  await expect(page.locator('#toast-region')).toContainText('Dirección guardada');
}

test('cambiar el nombre en el perfil y recargar muestra el nombre nuevo', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('perfil.html');
  await page.fill('#pf-nombre', 'Beatriz');
  await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#toast-region')).toContainText('Cambios guardados');
  await page.reload();
  await expect(page.locator('#pf-nombre')).toHaveValue('Beatriz');
  await expect(page.locator('#dd-account, #btn-account').first()).toBeAttached();
});

test('el perfil ya no pide fecha de nacimiento y acepta el apellido vacío', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('perfil.html');
  await expect(page.locator('#pf-nac')).toHaveCount(0);
  await expect(page.getByText('Fecha de nacimiento')).toHaveCount(0);
  await expect(page.locator('#pf-apellido')).not.toHaveAttribute('aria-required', 'true');
  await page.fill('#pf-apellido', '');
  await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#toast-region')).toContainText('Cambios guardados');
  await page.reload();
  await expect(page.locator('#pf-apellido')).toHaveValue('');
});

test('cambiar el correo con la clave actual equivocada avisa en su campo', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('perfil.html');
  await page.fill('#pf-email', `otro+${Date.now()}@correo.com`);
  await page.fill('#pf-pass', 'clave-equivocada');
  await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#err-pf-pass')).toHaveText('La contraseña actual no es correcta.');
});

test('mientras el perfil se guarda el botón queda en Guardando y un segundo clic se ignora', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('perfil.html');
  let llamadas = 0;
  await page.route('**/api/yo', async r => {
    if (r.request().method() !== 'PATCH') return r.continue();
    llamadas++;
    await new Promise(f => setTimeout(f, 700));
    await r.continue();
  });
  const boton = page.locator('#pf-form button[type=submit]');
  await page.fill('#pf-nombre', 'Carla');
  await boton.click();
  await expect(boton).toHaveAttribute('aria-disabled', 'true');
  await expect(boton).toHaveText('Guardando…');
  await boton.click({ force: true });
  await expect(page.locator('#toast-region')).toContainText('Cambios guardados');
  await expect(boton).not.toHaveAttribute('aria-disabled', 'true');
  await expect(boton).toHaveText('Guardar cambios');
  expect(llamadas).toBe(1);
});

test('dos direcciones y la segunda como principal sobreviven a recargar', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('direcciones.html');
  await agregarDireccion(page, 'Casa', 'Av. Amazonas N34-12');
  await agregarDireccion(page, 'Oficina', 'Av. 6 de Diciembre N20-45');
  await page.click('article:has-text("Oficina") [data-action=addr-main]');
  await expect(page.locator('#toast-region')).toContainText('Dirección principal actualizada');
  // Sin recargar, la lista ya se redibujó y la sesión del sitio quedó al día
  await expect(page.locator('#addr-list article').first()).toContainText('Oficina');
  expect(await page.evaluate(() => currentUser().addresses.map(a => [a.alias, a.principal]))).toEqual([['Oficina', true], ['Casa', false]]);
  await page.reload();
  await expect(page.locator('#addr-list article')).toHaveCount(2);
  await expect(page.locator('#addr-list article', { hasText: 'Oficina' }).getByText('Principal', { exact: true })).toHaveCount(1);
  await expect(page.locator('#addr-list article', { hasText: 'Casa' }).getByText('Principal', { exact: true })).toHaveCount(0);
});

test('eliminar la principal pasa la marca a la que queda y se conserva al recargar', async ({ page }) => {
  await cuentaNueva(page);
  await page.goto('direcciones.html');
  await agregarDireccion(page, 'Casa', 'Av. Amazonas N34-12');
  await agregarDireccion(page, 'Oficina', 'Av. 6 de Diciembre N20-45');
  await page.click('article:has-text("Casa") [data-action=addr-del]');
  await page.click('#modal-actions button:has-text("Sí, eliminar")');
  await expect(page.locator('#toast-region')).toContainText('Dirección eliminada');
  await page.reload();
  await expect(page.locator('#addr-list article')).toHaveCount(1);
  await expect(page.locator('#addr-list article')).toContainText('Principal');
});

test('si la API de direcciones falla se muestra el error y Reintentar vuelve a pedir la lista', async ({ page }) => {
  await cuentaNueva(page);
  let fallar = true;
  await page.route('**/api/direcciones', r => fallar
    ? r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'No pudimos cargar tus direcciones.' }) })
    : r.continue());
  await page.goto('direcciones.html');
  await expect(page.locator('#addr-list')).toContainText('No pudimos cargar tus direcciones.');
  const reintentar = page.getByRole('button', { name: 'Reintentar' });
  await expect(reintentar).toBeVisible();
  fallar = false;
  await reintentar.click();
  await expect(page.locator('#addr-list')).toContainText('Todavía no tienes direcciones guardadas');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
});

test('Direcciones muestra Cargando mientras espera la lista', async ({ page }) => {
  await cuentaNueva(page);
  await page.route('**/api/direcciones', async r => { await new Promise(f => setTimeout(f, 800)); await r.continue(); });
  await page.goto('direcciones.html');
  await expect(page.locator('#addr-list')).toContainText('Cargando tus direcciones…');
  await expect(page.locator('#addr-list')).toContainText('Todavía no tienes direcciones guardadas');
});

async function correoDeRecuperacion(page, correo) {
  const r = await page.request.get('/api/_prueba/correos?para=' + encodeURIComponent(correo));
  const correos = await r.json();
  const enlace = correos.map(c => c.texto.match(/recuperar\.html\?codigo=([0-9a-f]{64})/)).find(Boolean);
  expect(enlace, 'el correo trae el enlace').toBeTruthy();
  return enlace[1];
}

test('recuperar la contraseña completo y entrar con la nueva', async ({ page }) => {
  const { correo } = await cuentaNueva(page, { sesion: false });
  await page.goto('recuperar.html');
  await page.fill('#rc-email', correo);
  await page.click('#rc-form button[type=submit]');
  await expect(page.locator('#rc-ok')).toContainText('Si el correo tiene una cuenta, te enviamos un enlace');
  await expect.poll(async () => (await (await page.request.get('/api/_prueba/correos?para=' + encodeURIComponent(correo))).json()).length).toBeGreaterThan(0);
  const codigo = await correoDeRecuperacion(page, correo);
  await page.goto('recuperar.html?codigo=' + codigo);
  await expect(page.locator('#rc-email')).toHaveCount(0);
  await page.fill('#rc-nueva', 'otraclave987');
  await page.fill('#rc-repetir', 'otraclave987');
  await page.click('#rc-form button[type=submit]');
  await expect(page.locator('#rc-body')).toContainText('Tu contraseña se cambió. Ya puedes iniciar sesión.');
  await page.getByRole('link', { name: /iniciar sesión/i }).first().click();
  await expect(page).toHaveURL(/login\.html/);
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', 'otraclave987');
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/perfil\.html/);
});

test('un enlace ya usado muestra el aviso y el camino para pedir otro', async ({ page }) => {
  const { correo } = await cuentaNueva(page, { sesion: false });
  await page.request.post('/api/recuperar', { data: { correo }, headers: { 'X-CSRF': (await (async () => { await page.request.get('/api/yo'); return (await page.context().cookies()).find(c => c.name === 'mk_csrf').value; })()) } });
  await expect.poll(async () => (await (await page.request.get('/api/_prueba/correos?para=' + encodeURIComponent(correo))).json()).length).toBeGreaterThan(0);
  const codigo = await correoDeRecuperacion(page, correo);
  for (const clave of ['primera12345', 'segunda12345']) {
    await page.goto('recuperar.html?codigo=' + codigo);
    await page.fill('#rc-nueva', clave); await page.fill('#rc-repetir', clave);
    await page.click('#rc-form button[type=submit]');
    if (clave === 'primera12345') await expect(page.locator('#rc-body')).toContainText('Tu contraseña se cambió');
  }
  await expect(page.locator('#err-rc-nueva, #rc-errors, #rc-body').first()).toBeVisible();
  await expect(page.locator('#rc-body')).toContainText('El enlace venció o ya se usó. Pide uno nuevo.');
  await expect(page.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', 'recuperar.html');
});

test('dos claves distintas muestran el error en la segunda sin llamar a la API', async ({ page }) => {
  let llamadas = 0;
  await page.route('**/api/recuperar/**', r => { llamadas++; r.continue(); });
  await page.goto('recuperar.html?codigo=' + 'a'.repeat(64));
  await page.fill('#rc-nueva', 'clave-uno-123');
  await page.fill('#rc-repetir', 'clave-dos-456');
  await page.click('#rc-form button[type=submit]');
  await expect(page.locator('#err-rc-repetir')).toHaveText('Las contraseñas no coinciden.');
  await expect(page.locator('#rc-repetir')).toBeFocused();
  expect(llamadas).toBe(0);
});

test('la pantalla de clave nueva se maneja solo con teclado', async ({ page }) => {
  await page.goto('recuperar.html?codigo=' + 'b'.repeat(64));
  await expect(page.locator('#rc-nueva')).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.locator('#rc-repetir')).toHaveAttribute('autocomplete', 'new-password');
  await page.focus('#rc-nueva');
  await page.keyboard.press('Tab');
  const mostrar = page.getByRole('button', { name: 'Mostrar contraseña' }).first();
  await expect(mostrar).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#rc-nueva')).toHaveAttribute('type', 'text');
  await page.keyboard.press('Tab');
  await expect(page.locator('#rc-repetir')).toBeFocused();
});
