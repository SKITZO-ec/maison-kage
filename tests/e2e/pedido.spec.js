// Carrito con sesión, pago, confirmación y Mis pedidos guardados en la base
// Toda compra de este archivo es de decants de 5 ml de Asad, que tiene 40 de stock,
// así los tres anchos que corren en paralelo sobre la misma base no se quedan sin unidades
const { test, expect, cuentaNueva, carritoCon, ponerStock } = require('../soporte/fixtures');

const correoUnico = () => `ana+${Date.now()}${Math.random().toString(16).slice(2, 8)}@correo.com`;
const carritoGuardado = async page => (await page.request.get('/api/carrito')).json();
const pedidosGuardados = async page => (await page.request.get('/api/pedidos')).json();
const carritoDelNavegador = page => page.evaluate(() => (JSON.parse(sessionStorage.getItem('mk-sesion') || '{}').cart) || []);

/* Llena el checkout con envío a domicilio y abre la pasarela de tarjeta con datos válidos */
async function abrirPagoConTarjeta(page) {
  await page.goto('checkout.html');
  await page.fill('#co-tel', '0991234567');
  await page.selectOption('#co-ciudad', 'Quito');
  await page.fill('#co-dir', 'Av. Amazonas N24 y Colón');
  await page.click('#co-submit');
  await page.fill('#cd-num', '4111111111111111');
  await page.fill('#cd-name', 'Ana Ruiz');
  await page.fill('#cd-exp', '08/30');
  await page.fill('#cd-cvv', '123');
}

test('el carrito sin sesión pasa a la cuenta al iniciar sesión', async ({ page }) => {
  const { correo, clave } = await cuentaNueva(page, { sesion: false });
  await page.goto('producto.html?id=khamrah&formato=decant');
  await page.evaluate(() => addToCart('khamrah', 'decant', 5, 1, true));
  await page.goto('login.html?next=carrito.html');
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', clave);
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/\/carrito\.html$/);
  await expect(page.locator('#app ul > li')).toHaveCount(1);
  await expect(page.locator('#app ul > li')).toContainText('Decant 5 ml');
  expect(await carritoDelNavegador(page)).toEqual([]);
  await page.reload();
  await expect(page.locator('#app ul > li')).toHaveCount(1);
  await expect(page.locator('#app ul > li')).toContainText('Khamrah');
  expect(await carritoGuardado(page)).toEqual([{ id: 'khamrah', kind: 'decant', ml: 5, qty: 1 }]);
});

test('el carrito sin sesión pasa a la cuenta nueva al registrarse', async ({ page }) => {
  await page.goto('producto.html?id=khamrah&formato=decant');
  await page.evaluate(() => addToCart('khamrah', 'decant', 5, 2, true));
  await page.goto('registro.html?next=carrito.html');
  await page.fill('#rg-nombre', 'Ana Ruiz'); await page.fill('#rg-email', correoUnico()); await page.fill('#rg-tel', '0991234567');
  await page.fill('#rg-pass', 'clave1234'); await page.fill('#rg-pass2', 'clave1234');
  await page.click('#rg-form button[type=submit]');
  await expect(page).toHaveURL(/\/carrito\.html$/);
  await expect(page.locator('#cart-count')).toHaveText('2');
  expect(await carritoDelNavegador(page)).toEqual([]);
  expect(await carritoGuardado(page)).toEqual([{ id: 'khamrah', kind: 'decant', ml: 5, qty: 2 }]);
});

test('con sesión los cambios del carrito se guardan en la cuenta', async ({ page }) => {
  await cuentaNueva(page);
  await carritoCon(page, [['asad', 'decant', 5, 1], ['khamrah', 'decant', 2, 1]]);
  await page.goto('carrito.html');
  await expect(page.locator('#app ul > li')).toHaveCount(2);
  const guardado = () => page.waitForResponse(r => r.url().endsWith('/api/carrito') && r.request().method() === 'PUT');
  let r = guardado();
  await page.getByRole('group', { name: /Cantidad de Asad 5 ml/ }).getByRole('button', { name: 'Sumar una unidad' }).click();
  await r;
  expect(await carritoGuardado(page)).toEqual([{ id: 'asad', kind: 'decant', ml: 5, qty: 2 }, { id: 'khamrah', kind: 'decant', ml: 2, qty: 1 }]);
  r = guardado();
  await page.getByRole('button', { name: /Quitar Khamrah/ }).click();
  await r;
  expect(await carritoGuardado(page)).toEqual([{ id: 'asad', kind: 'decant', ml: 5, qty: 2 }]);
  r = guardado();
  await page.getByRole('button', { name: /Deshacer/ }).click();
  await r;
  await page.reload();
  await expect(page.locator('#app ul > li')).toHaveCount(2);
  await expect(page.locator('#cart-count')).toHaveText('3');
  expect(page.erroresConsola).toEqual([]);
});

test('pagar con tarjeta lleva a la confirmación y el pedido aparece en Mis pedidos', async ({ page }) => {
  await cuentaNueva(page);
  await carritoCon(page, [['asad', 'decant', 5, 1]]);
  await abrirPagoConTarjeta(page);
  await page.click('#gw-pay');
  await expect(page).toHaveURL(/\/confirmacion\.html\?n=MK-\d{6,}$/, { timeout: 10000 });
  const num = new URL(page.url()).searchParams.get('n');
  await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
  await expect(page.locator('#app')).toContainText(`tu número de pedido es ${num}`);
  await expect(page.locator('#app')).toContainText('1 × Asad · Decant 5 ml');
  await expect(page.locator('#cart-count')).toBeHidden();
  expect(await carritoGuardado(page)).toEqual([]);

  await page.goto('pedidos.html');
  const pedido = page.locator('#orders article');
  await expect(pedido).toHaveCount(1);
  await expect(pedido).toContainText(`Pedido ${num}`);
  await expect(pedido).toContainText('En preparación');
  const hoy = await page.evaluate(() => new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }));
  await expect(pedido).toContainText(`${hoy} · Tarjeta`);
  expect(page.erroresConsola).toEqual([]);
});

test('Deuna con Ya pagué deja el pedido en verificación', async ({ page }) => {
  await cuentaNueva(page);
  await carritoCon(page, [['asad', 'decant', 5, 1]]);
  await page.goto('checkout.html');
  await page.fill('#co-tel', '0991234567');
  await page.check('input[value=retiro]');
  await page.check('input[value=Deuna]');
  await page.click('#co-submit');
  await page.click('#gw-late');
  await expect(page).toHaveURL(/\/confirmacion\.html\?n=MK-\d{6,}$/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Pedido recibido' })).toBeVisible();
  const [o] = await pedidosGuardados(page);
  expect([o.metodo, o.estado, o.entrega]).toEqual(['Deuna', 'Pago en verificación', 'retiro']);
});

test('la confirmación sin número o con uno que no existe no muestra ningún pedido', async ({ page }) => {
  await cuentaNueva(page);
  for (const url of ['confirmacion.html', 'confirmacion.html?n=MK-999999', 'confirmacion.html?n=otra-cosa']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'No hay un pedido reciente' })).toBeVisible();
  }
  expect(page.erroresConsola.filter(e => !/404/.test(e))).toEqual([]);
});

test('Mis pedidos avisa mientras carga y deja reintentar si falla', async ({ page }) => {
  await cuentaNueva(page);
  let falla = true, pedidas = 0, soltar;
  const espera = new Promise(r => { soltar = r; });
  await page.route('**/api/pedidos', async r => {
    pedidas++;
    if (!falla) return r.continue();
    await espera;
    return r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'El servicio no está disponible. Intenta en un momento.' }) });
  });
  await page.goto('pedidos.html');
  await expect(page.locator('#orders')).toContainText('Cargando tus pedidos…');
  soltar();
  await expect(page.locator('#orders')).toContainText('El servicio no está disponible. Intenta en un momento.');
  falla = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('#orders')).toContainText('Aún no tienes pedidos');
  expect(pedidas).toBe(2);
});

test('doble clic rápido en Pagar crea un solo pedido', async ({ page }) => {
  await cuentaNueva(page);
  await carritoCon(page, [['asad', 'decant', 5, 1]]);
  await abrirPagoConTarjeta(page);
  await page.locator('#gw-pay').dblclick();
  await expect(page.locator('#gw-pay')).toHaveAttribute('aria-disabled', 'true');
  /* Más intentos mientras espera, con el botón y con Enter en el formulario */
  await page.evaluate(() => { document.getElementById('gw-pay').click(); document.getElementById('gw-pay').click(); });
  await expect(page).toHaveURL(/\/confirmacion\.html\?n=MK-/, { timeout: 10000 });
  expect(await pedidosGuardados(page)).toHaveLength(1);
});

test('si otro cliente compró la última unidad el checkout avisa y no navega', async ({ page }, info) => {
  /* Cada ancho usa su propio perfume, así el stock en cero de uno no toca a los otros */
  const id = { escritorio: 'naxos', tablet: 'layton', movil: 'hacivat' }[info.project.name];
  await cuentaNueva(page);
  await carritoCon(page, [[id, 'decant', 5, 1]]);
  await abrirPagoConTarjeta(page);
  await ponerStock(page, id, 'decant', 5, 0);
  await page.click('#gw-pay');
  const errores = page.locator('#co-errors');
  await expect(errores).toBeVisible({ timeout: 10000 });
  await expect(errores).toContainText(/Ya no quedan unidades de .+ 5 ml\./);
  await expect(errores).toBeFocused();
  await expect(page.locator('#modal-root')).toBeHidden();
  await expect(page).toHaveURL(/\/checkout\.html$/);
  expect(await pedidosGuardados(page)).toEqual([]);
});

test('volver a iniciar sesión con la sesión abierta no duplica el carrito de la cuenta', async ({ page }) => {
  const { correo, clave } = await cuentaNueva(page);
  await carritoCon(page, [['asad', 'decant', 5, 2]]);
  await page.goto('login.html');
  expect(await page.evaluate(() => state.cart.map(l => [l.id, l.qty]))).toEqual([['asad', 2]]);
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', clave);
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/\/perfil\.html$/);
  await page.waitForLoadState('load');
  expect(await carritoGuardado(page)).toEqual([{ id: 'asad', kind: 'decant', ml: 5, qty: 2 }]);
  await expect(page.locator('#cart-count')).toHaveText('2');
});
