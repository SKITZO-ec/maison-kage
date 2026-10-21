// Fixture común de las pruebas
// El entorno de pruebas no llega al CDN de Tailwind, por eso esa petición
// se responde con un script que carga el CSS generado en tests/.tw.css
const base = require('@playwright/test');
const crypto = require('node:crypto');

const test = base.test.extend({
  page: async ({ page }, use) => {
    // Las rutas van en el contexto, así también las usan las pestañas que abra la prueba
    await page.context().route('https://cdn.tailwindcss.com/**', r => r.fulfill({
      contentType: 'text/javascript',
      body: "window.tailwind={};document.head.insertAdjacentHTML('beforeend','<link rel=\"stylesheet\" href=\"/tests/.tw.css\">');"
    }));
    // El CSS se entrega desde el disco, así el servidor no tiene que publicar la carpeta tests
    await page.context().route('**/tests/.tw.css', r => r.fulfill({ contentType: 'text/css', path: require('node:path').join(__dirname, '..', '.tw.css') }));
    page.erroresConsola = [];
    page.on('pageerror', e => page.erroresConsola.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) page.erroresConsola.push(m.text());
    });
    await use(page);
  }
});

/* ---------- Cuentas por la API ----------
   page.request comparte las cookies con la página, así la sesión que abre
   la API es la misma que ve el sitio en la siguiente navegación */

/* Valor de la cookie mk_csrf. Si todavía no existe, un GET cualquiera la crea */
async function csrf(page) {
  const buscar = async () => (await page.context().cookies()).find(c => c.name === 'mk_csrf');
  if (!(await buscar())) await page.request.get('/api/yo');
  return (await buscar()).value;
}

async function enviar(page, ruta, datos) {
  const r = await page.request.post(ruta, { data: datos, headers: { 'X-CSRF': await csrf(page) } });
  if (!r.ok()) throw new Error(`${ruta} respondió ${r.status()} ${await r.text()}`);
  return r;
}

/* Crea una cuenta con un correo que no se repite entre pruebas en paralelo.
   Por defecto deja la sesión abierta, igual que el registro del sitio.
   Con { sesion: false } la cierra enseguida, para las pruebas que deben pasar por el login.
   Devuelve { correo, clave } para escribirlos después en el formulario */
async function cuentaNueva(page, datos = {}) {
  const { sesion = true, ...resto } = datos;
  const cuenta = {
    nombre: 'Ana', apellido: 'Ruiz', telefono: '0991234567', clave: 'clave1234',
    correo: `ana+${crypto.randomBytes(6).toString('hex')}@correo.com`,
    ...resto
  };
  await enviar(page, '/api/registro', cuenta);
  if (!sesion) await salir(page);
  return { correo: cuenta.correo, clave: cuenta.clave };
}

/* Inicia sesión por la API, sin pasar por el formulario */
async function entrar(page, correo, clave) {
  await enviar(page, '/api/login', { correo, clave });
}

/* Cierra la sesión por la API */
async function salir(page) {
  await enviar(page, '/api/logout', {});
}

/* Deja el carrito de la cuenta con sesión con estas líneas, por la API.
   Cada línea puede ser [id, kind, ml, qty] o { id, kind, ml, qty }.
   Devuelve lo que guardó el servidor, ya saneado */
async function carritoCon(page, lineas) {
  const datos = lineas.map(l => Array.isArray(l) ? { id: l[0], kind: l[1], ml: l[2], qty: l[3] } : l);
  const r = await page.request.put('/api/carrito', { data: { lineas: datos }, headers: { 'X-CSRF': await csrf(page) } });
  if (!r.ok()) throw new Error(`/api/carrito respondió ${r.status()} ${await r.text()}`);
  return r.json();
}

/* Cambia el stock de una presentación en la base de pruebas, como si otro cliente hubiera comprado.
   La base es una sola para los tres anchos en paralelo, por eso cada prueba que lo usa
   debe tocar una presentación que ninguna otra prueba compra ni revisa */
async function ponerStock(page, id, kind, ml, stock) {
  await enviar(page, '/api/_prueba/stock', { id, kind, ml, stock });
}

/* Crea un pedido por la API con lo que tenga el carrito guardado. Por defecto con tarjeta y envío a Quito.
   Devuelve el pedido con la misma forma que lee el sitio */
async function pedidoNuevo(page, datos = {}) {
  const r = await enviar(page, '/api/pedidos', {
    nombre: 'Ana Ruiz', correo: 'a@b.com', telefono: '0991234567', entrega: 'envio',
    ciudad: 'Quito', dir: 'Av. Amazonas', ref: '', metodo: 'tarjeta', ultimos4: '1111', ...datos
  });
  return r.json();
}

module.exports = { test, expect: base.expect, cuentaNueva, entrar, salir, carritoCon, ponerStock, pedidoNuevo };
