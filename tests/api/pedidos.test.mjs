/* Pruebas de pedidos con transacción, correo y concurrencia */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { iniciarApp, cliente } from './ayuda.mjs';
import { cargarConfig } from '../../backend/config.js';
import { prepararBd } from '../../herramientas/preparar-bd.mjs';

/* Estas pruebas cambian stock y productos, por eso corren en su propia base.
   Así no compiten con los otros archivos que leen el catálogo de maisonkage_test en paralelo */
const BD_PROPIA = 'maisonkage_test_pedidos';
let app;
before(async () => {
  const base = cargarConfig(['--prueba']).bd;
  await prepararBd({ ...base, database: BD_PROPIA });
  app = await iniciarApp({ bd: { database: BD_PROPIA } });
});
after(async () => {
  await app.cerrar();
  const { database, ...conexion } = cargarConfig(['--prueba']).bd;
  const admin = new pg.Client({ ...conexion, database: 'postgres' });
  await admin.connect();
  try{ await admin.query(`DROP DATABASE IF EXISTS "${BD_PROPIA}" WITH (FORCE)`); }finally{ await admin.end(); }
});

let n = 0;
async function conSesion(telefono = '0991234567'){
  const api = cliente(app.base);
  const correo = `ped${Date.now()}${n++}@prueba.com`;
  const r = await api.post('/api/registro', { nombre: 'Ana', apellido: 'Ruiz', correo, telefono, clave: 'secreta123' });
  assert.equal(r.status, 201);
  api.correo = correo;
  return api;
}
const linea = (id, kind, ml, qty) => ({ id, kind, ml, qty });
async function llenar(api, ...lineas){
  const r = await api.put('/api/carrito', { lineas });
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.length, lineas.length, 'el carrito debe quedar con todas las líneas');
}
const datos = (extra = {}) => ({
  nombre: 'Ana Ruiz', correo: 'ana@prueba.com', telefono: '0991234567',
  entrega: 'envio', ciudad: 'Quito', dir: 'Av. Amazonas N24-15 y Colón', ref: 'Edificio azul',
  metodo: 'tarjeta', ultimos4: '4242', ...extra
});
const stockDe = async (slug, tipo, ml) => (await app.pool.query(
  `SELECT R.Pre_stock FROM Presentacion R JOIN Producto P ON P.Pro_id = R.Pro_id
    WHERE P.Pro_slug = $1 AND R.Pre_tipo = $2 AND R.Pre_ml = $3`, [slug, tipo, ml])).rows[0].pre_stock;
const fijarStock = (slug, tipo, ml, stock) => app.pool.query(
  `UPDATE Presentacion SET Pre_stock = $4
    WHERE Pre_tipo = $2 AND Pre_ml = $3 AND Pro_id = (SELECT Pro_id FROM Producto WHERE Pro_slug = $1)`, [slug, tipo, ml, stock]);

test('sin sesión todas las rutas responden 401', async () => {
  const api = cliente(app.base);
  for (const [m, ruta, cuerpo] of [['post', '/api/pedidos', datos()], ['get', '/api/pedidos'], ['get', '/api/pedidos/MK-000001']]){
    const r = await api[m](ruta, cuerpo);
    assert.equal(r.status, 401, `${m} ${ruta}`);
  }
});

test('frasco con oferta del 20 % en envío cobra 27.2 más 3.5 y baja el stock', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'frasco', 50, 1));
  const antes = await stockDe('khamrah', 'frasco', 50);
  try{
    const r = await api.post('/api/pedidos', datos({ correo: api.correo }));
    assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
    const p = r.cuerpo;
    assert.match(p.num, /^MK-\d{6}$/);
    assert.equal(p.sub, 27.2);
    assert.equal(p.ship, 3.5);
    assert.equal(p.total, 30.7);
    assert.equal(p.metodo, 'Tarjeta');
    assert.equal(p.entrega, 'envio');
    assert.equal(p.email, api.correo);
    assert.match(p.guia, /^\d{12}$/);
    assert.deepEqual(p.items, [{ nombre: 'Khamrah', desc: 'Frasco 50 ml', qty: 1, unit: 27.2 }]);
    assert.deepEqual(p.envio, { nombre: 'Ana Ruiz', dir: 'Av. Amazonas N24-15 y Colón', ciudad: 'Quito', ref: 'Edificio azul', tel: '0991234567' });
    assert.equal(p.estado, 'En preparación');
    assert.ok(!Number.isNaN(Date.parse(p.fecha)));
    assert.equal(await stockDe('khamrah', 'frasco', 50), antes - 1);
  }finally{
    await fijarStock('khamrah', 'frasco', 50, antes);
  }
});

test('un cuerpo con precio, total o items inventados no cambia lo cobrado', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const r = await api.post('/api/pedidos', datos({ correo: api.correo, precio: 0.01, total: 0.01, sub: 0.01, ship: 0, items: [{ nombre: 'X', qty: 1, unit: 0.01 }] }));
  assert.equal(r.status, 201);
  assert.equal(r.cuerpo.sub, 12);
  assert.equal(r.cuerpo.total, 15.5);
  assert.equal(r.cuerpo.items.length, 1);
  assert.equal(r.cuerpo.items[0].desc, 'Decant 10 ml');
  assert.equal(r.cuerpo.items[0].unit, 12);
});

test('desde 60 el envío es gratis y en retiro también, sin guía ni dirección', async () => {
  const gratis = await conSesion();
  await llenar(gratis, linea('khamrah', 'decant', 10, 5));
  const a = await gratis.post('/api/pedidos', datos({ correo: gratis.correo }));
  assert.equal(a.status, 201);
  assert.equal(a.cuerpo.sub, 60);
  assert.equal(a.cuerpo.ship, 0);
  assert.equal(a.cuerpo.total, 60);

  const retiro = await conSesion();
  await llenar(retiro, linea('khamrah', 'decant', 10, 1));
  const b = await retiro.post('/api/pedidos', datos({ correo: retiro.correo, entrega: 'retiro', ciudad: 'Cuenca', dir: 'Otra calle', ref: 'algo' }));
  assert.equal(b.status, 201);
  assert.equal(b.cuerpo.ship, 0);
  assert.equal(b.cuerpo.total, 12);
  assert.equal(b.cuerpo.entrega, 'retiro');
  assert.equal(b.cuerpo.guia, null);
  assert.deepEqual(b.cuerpo.envio, { nombre: 'Ana Ruiz', dir: '', ciudad: '', ref: '', tel: '0991234567' });
  assert.equal(b.cuerpo.estado, 'En preparación');
});

test('con tarjeta solo se guardan los últimos 4 y las letras responden 400', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const mala = await api.post('/api/pedidos', datos({ correo: api.correo, ultimos4: 'abcd' }));
  assert.equal(mala.status, 400);
  assert.ok(mala.cuerpo.error);
  const larga = await api.post('/api/pedidos', datos({ correo: api.correo, ultimos4: '4242424242424242' }));
  assert.equal(larga.status, 400);
  const r = await api.post('/api/pedidos', datos({ correo: api.correo }));
  assert.equal(r.status, 201);
  const { rows } = await app.pool.query(
    `SELECT G.Pag_ultimos4, row_to_json(P)::text AS p, row_to_json(G)::text AS g, row_to_json(E)::text AS e
       FROM Pedido P JOIN Pago G ON G.Ped_id = P.Ped_id JOIN Envio E ON E.Ped_id = P.Ped_id WHERE P.Ped_numero = $1`, [r.cuerpo.num]);
  assert.equal(rows[0].pag_ultimos4, '4242');
  for (const col of ['p', 'g', 'e']) assert.doesNotMatch(rows[0][col], /\d{16}/);
});

test('el carrito queda vacío y un segundo pedido responde 400', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  assert.equal((await api.post('/api/pedidos', datos({ correo: api.correo }))).status, 201);
  assert.deepEqual((await api.get('/api/carrito')).cuerpo, []);
  const otra = await api.post('/api/pedidos', datos({ correo: api.correo }));
  assert.equal(otra.status, 400);
  assert.equal(otra.cuerpo.error, 'Tu carrito está vacío.');
});

test('Deuna con verificación queda en verificación y sin verificación en preparación', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const r = await api.post('/api/pedidos', datos({ correo: api.correo, metodo: 'deuna', verificacion: true, ultimos4: '1234' }));
  assert.equal(r.status, 201);
  assert.equal(r.cuerpo.metodo, 'Deuna');
  assert.equal(r.cuerpo.estado, 'Pago en verificación');
  const { rows } = await app.pool.query('SELECT Pag_ultimos4 FROM Pago G JOIN Pedido P ON P.Ped_id = G.Ped_id WHERE P.Ped_numero = $1', [r.cuerpo.num]);
  assert.equal(rows[0].pag_ultimos4, null);

  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const s = await api.post('/api/pedidos', datos({ correo: api.correo, metodo: 'deuna' }));
  assert.equal(s.cuerpo.estado, 'En preparación');

  /* verificacion con tarjeta no cuenta */
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const t = await api.post('/api/pedidos', datos({ correo: api.correo, verificacion: true }));
  assert.equal(t.status, 201);
  assert.equal(t.cuerpo.estado, 'En preparación');
});

test('valida los campos del cuerpo y no toca el carrito si falla', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const casos = [
    [{ nombre: '' }, 'Completa el campo Nombre.'],
    [{ correo: 'mal' }, 'Escribe un correo válido, por ejemplo nombre@correo.com.'],
    [{ telefono: '' }, 'Completa el campo Celular.'],
    [{ telefono: '123' }, 'Escribe un celular de 10 dígitos que empiece con 09.'],
    [{ entrega: 'volando' }, null],
    [{ metodo: 'cheque' }, null],
    [{ dir: '' }, 'Completa el campo Dirección.'],
    [{ ciudad: 'Atlantis' }, 'Elige una ciudad de la lista.']
  ];
  for (const [extra, mensaje] of casos){
    const r = await api.post('/api/pedidos', datos({ correo: api.correo, ...extra }));
    assert.equal(r.status, 400, JSON.stringify(extra));
    if (mensaje) assert.equal(r.cuerpo.error, mensaje);
  }
  assert.equal((await api.get('/api/carrito')).cuerpo.length, 1);
});

test('si el stock no alcanza responde el mensaje con N y no cambia nada', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 5, 3));
  const original = await stockDe('khamrah', 'decant', 5);
  await fijarStock('khamrah', 'decant', 5, 2);
  try{
    const r = await api.post('/api/pedidos', datos({ correo: api.correo }));
    assert.equal(r.status, 400);
    assert.equal(r.cuerpo.error, 'Solo quedan 2 decants de Khamrah 5 ml.');
    await fijarStock('khamrah', 'decant', 5, 0);
    const c = await api.post('/api/pedidos', datos({ correo: api.correo }));
    assert.equal(c.cuerpo.error, 'Ya no quedan unidades de Khamrah 5 ml.');
    assert.equal(await stockDe('khamrah', 'decant', 5), 0);
    assert.equal((await api.get('/api/carrito')).cuerpo.length, 1);
  }finally{
    await fijarStock('khamrah', 'decant', 5, original);
  }
});

test('un producto desactivado cuenta como no disponible', async () => {
  const api = await conSesion();
  await llenar(api, linea('yara', 'decant', 2, 1));
  await app.pool.query(`UPDATE Producto SET Pro_activo = FALSE WHERE Pro_slug = 'yara'`);
  try{
    const r = await api.post('/api/pedidos', datos({ correo: api.correo }));
    assert.equal(r.status, 400);
    assert.match(r.cuerpo.error, /ya no está disponible|Ya no quedan/i);
  }finally{
    await app.pool.query(`UPDATE Producto SET Pro_activo = TRUE WHERE Pro_slug = 'yara'`);
  }
});

test('Concurrencia: dos pedidos por la última unidad, uno gana y el otro recibe 400', async () => {
  const a = await conSesion();
  const b = await conSesion();
  await llenar(a, linea('khamrah', 'frasco', 100, 1));
  await llenar(b, linea('khamrah', 'frasco', 100, 1));
  const original = await stockDe('khamrah', 'frasco', 100);
  await fijarStock('khamrah', 'frasco', 100, 1);
  try{
    const [ra, rb] = await Promise.all([
      a.post('/api/pedidos', datos({ correo: a.correo })),
      b.post('/api/pedidos', datos({ correo: b.correo }))
    ]);
    const estados = [ra.status, rb.status].sort();
    assert.deepEqual(estados, [201, 400], JSON.stringify([ra.cuerpo, rb.cuerpo]));
    const perdedor = ra.status === 400 ? ra : rb;
    assert.match(perdedor.cuerpo.error, /^(No hay stock suficiente de Khamrah 100 ml|Solo quedan 0 .*|Ya no quedan unidades de Khamrah 100 ml\.)/);
    assert.equal(await stockDe('khamrah', 'frasco', 100), 0);
  }finally{
    await fijarStock('khamrah', 'frasco', 100, original);
  }
});

test('dos pedidos simultáneos del mismo usuario cobran una sola vez', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const rs = await Promise.all([
    api.post('/api/pedidos', datos({ correo: api.correo })),
    api.post('/api/pedidos', datos({ correo: api.correo }))
  ]);
  assert.deepEqual(rs.map(r => r.status).sort(), [201, 400]);
  assert.equal(rs.find(r => r.status === 400).cuerpo.error, 'Tu carrito está vacío.');
});

test('el correo de confirmación lleva número, total y los pasos de la guía', async () => {
  const api = await conSesion();
  await llenar(api, linea('khamrah', 'decant', 10, 2));
  const antes = app.correo.bandeja.length;
  const r = await api.post('/api/pedidos', datos({ correo: 'contacto-' + api.correo }));
  assert.equal(r.status, 201);
  /* el envío del correo no se espera, se da un momento */
  for (let i = 0; i < 20 && app.correo.bandeja.length === antes; i++) await new Promise(res => setTimeout(res, 25));
  const c = app.correo.bandeja.find(m => m.para === 'contacto-' + api.correo);
  assert.ok(c, 'debe haber un correo para el correo de contacto');
  for (const parte of [r.cuerpo.num, '$27.50', 'En proceso', 'Khamrah', 'Decant 10 ml', r.cuerpo.guia,
    '1. Copia tu número de guía', '2. Abre la página de rastreo de Servientrega',
    'https://www.servientrega.com/wps/portal/rastreo-envio', '3. Pega el número y consulta']){
    assert.ok(c.texto.includes(parte), `el texto debe incluir ${parte}`);
    assert.ok(c.html.includes(parte.replace(/&/g, '&amp;')), `el html debe incluir ${parte}`);
  }

  await llenar(api, linea('khamrah', 'decant', 10, 1));
  const r2 = await api.post('/api/pedidos', datos({ correo: 'retiro-' + api.correo, entrega: 'retiro' }));
  for (let i = 0; i < 20 && !app.correo.bandeja.some(m => m.para === 'retiro-' + api.correo); i++) await new Promise(res => setTimeout(res, 25));
  const c2 = app.correo.bandeja.find(m => m.para === 'retiro-' + api.correo);
  assert.ok(c2.texto.includes(r2.cuerpo.num));
  assert.ok(!c2.texto.includes('Servientrega'));
});

test('un pedido de otro usuario responde 404 y la lista es propia, del más nuevo al más viejo', async () => {
  const dueno = await conSesion();
  const otro = await conSesion();
  await llenar(dueno, linea('khamrah', 'decant', 10, 1));
  const p1 = (await dueno.post('/api/pedidos', datos({ correo: dueno.correo }))).cuerpo;
  await llenar(dueno, linea('khamrah', 'decant', 2, 1));
  const p2 = (await dueno.post('/api/pedidos', datos({ correo: dueno.correo, entrega: 'retiro' }))).cuerpo;

  const lista = await dueno.get('/api/pedidos');
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.cuerpo.map(p => p.num), [p2.num, p1.num]);
  assert.deepEqual(lista.cuerpo[1], p1);

  const uno = await dueno.get('/api/pedidos/' + p1.num);
  assert.equal(uno.status, 200);
  assert.deepEqual(uno.cuerpo, p1);

  const ajeno = await otro.get('/api/pedidos/' + p1.num);
  assert.equal(ajeno.status, 404);
  assert.equal(ajeno.cuerpo.error, 'No encontramos ese pedido.');
  assert.equal((await otro.get('/api/pedidos/MK-999999')).status, 404);
  assert.equal((await otro.get('/api/pedidos/basura')).status, 404);
  assert.deepEqual((await otro.get('/api/pedidos')).cuerpo, []);
});

test('el primer pedido con envío guarda el celular y la dirección Principal si faltan', async () => {
  const api = await conSesion(undefined);
  /* conSesion(undefined) usa el valor por defecto, se registra otra cuenta sin celular */
  const sin = cliente(app.base);
  const correo = `sin${Date.now()}${n++}@prueba.com`;
  assert.equal((await sin.post('/api/registro', { nombre: 'Luis', apellido: 'Paz', correo, clave: 'secreta123' })).status, 201);
  await llenar(sin, linea('khamrah', 'decant', 10, 1));
  const r = await sin.post('/api/pedidos', datos({ correo, telefono: '0987654321' }));
  assert.equal(r.status, 201);
  assert.equal((await sin.get('/api/yo')).cuerpo.telefono, '0987654321');
  const dirs = (await sin.get('/api/direcciones')).cuerpo;
  assert.equal(dirs.length, 1);
  assert.equal(dirs[0].alias, 'Principal');
  assert.equal(dirs[0].principal, true);
  assert.equal(dirs[0].dir, 'Av. Amazonas N24-15 y Colón');
  assert.equal(dirs[0].tel, '0987654321');

  /* un segundo pedido con otros datos no cambia nada */
  await llenar(sin, linea('khamrah', 'decant', 10, 1));
  await sin.post('/api/pedidos', datos({ correo, telefono: '0911111111', dir: 'Otra calle 1' }));
  assert.equal((await sin.get('/api/yo')).cuerpo.telefono, '0987654321');
  assert.equal((await sin.get('/api/direcciones')).cuerpo.length, 1);

  /* quien ya tenía celular y direcciones no cambia, y el retiro no crea dirección */
  const ya = await conSesion('0991234567');
  await ya.post('/api/direcciones', { alias: 'Casa', dir: 'Calle 1', ciudad: 'Quito', tel: '0991234567' });
  await llenar(ya, linea('khamrah', 'decant', 10, 1));
  await ya.post('/api/pedidos', datos({ correo: ya.correo, telefono: '0922222222' }));
  assert.equal((await ya.get('/api/yo')).cuerpo.telefono, '0991234567');
  const d = (await ya.get('/api/direcciones')).cuerpo;
  assert.equal(d.length, 1);
  assert.equal(d[0].alias, 'Casa');

  const ret = cliente(app.base);
  const c2 = `ret${Date.now()}${n++}@prueba.com`;
  await ret.post('/api/registro', { nombre: 'Rita', apellido: 'Paz', correo: c2, clave: 'secreta123' });
  await llenar(ret, linea('khamrah', 'decant', 10, 1));
  await ret.post('/api/pedidos', datos({ correo: c2, entrega: 'retiro' }));
  assert.deepEqual((await ret.get('/api/direcciones')).cuerpo, []);
  void api;
});
