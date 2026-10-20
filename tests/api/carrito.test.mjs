/* Pruebas del carrito con sesión */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarApp, cliente } from './ayuda.mjs';
import { sanearLineas } from '../../backend/servicios/carrito.js';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app.cerrar(); });

let n = 0;
async function conSesion(){
  const api = cliente(app.base);
  const r = await api.post('/api/registro', { nombre: 'Ana', apellido: 'Ruiz', correo: `car${Date.now()}${n++}@prueba.com`, telefono: '0991234567', clave: 'secreta123' });
  assert.equal(r.status, 201);
  return api;
}
const linea = (id, kind, ml, qty) => ({ id, kind, ml, qty });
const ERROR_LECTURA = 'No pudimos leer tu carrito.';

test('sin sesión todas las rutas responden 401', async () => {
  const api = cliente(app.base);
  for (const [m, ruta, cuerpo] of [['get', '/api/carrito'], ['put', '/api/carrito', { lineas: [] }], ['post', '/api/carrito/fusionar', { lineas: [] }]]){
    const r = await api[m](ruta, cuerpo);
    assert.equal(r.status, 401, `${m} ${ruta}`);
  }
});

test('un carrito nuevo responde un arreglo vacío', async () => {
  const api = await conSesion();
  const r = await api.get('/api/carrito');
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, []);
});

test('PUT baja la cantidad de un frasco al stock real', async () => {
  const api = await conSesion();
  const r = await api.put('/api/carrito', { lineas: [linea('khamrah', 'frasco', 50, 99)] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, [linea('khamrah', 'frasco', 50, 6)]);
  assert.deepEqual((await api.get('/api/carrito')).cuerpo, r.cuerpo);
});

test('PUT con 50 decants de 2 ml deja 10', async () => {
  const api = await conSesion();
  const r = await api.put('/api/carrito', { lineas: [linea('khamrah', 'decant', 2, 50)] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, [linea('khamrah', 'decant', 2, 10)]);
});

test('PUT reemplaza todo el carrito y junta las líneas repetidas', async () => {
  const api = await conSesion();
  await api.put('/api/carrito', { lineas: [linea('asad', 'frasco', 50, 1)] });
  const r = await api.put('/api/carrito', { lineas: [linea('yara', 'frasco', 50, 1), linea('khamrah', 'decant', 5, 3), linea('khamrah', 'decant', 5, 4)] });
  assert.deepEqual(r.cuerpo, [linea('yara', 'frasco', 50, 1), linea('khamrah', 'decant', 5, 7)]);
  assert.deepEqual((await api.get('/api/carrito')).cuerpo, r.cuerpo);
  assert.deepEqual((await api.put('/api/carrito', { lineas: [] })).cuerpo, []);
  assert.deepEqual((await api.get('/api/carrito')).cuerpo, []);
});

test('fusionar descarta lo inválido y responde 200 con la línea buena', async () => {
  const api = await conSesion();
  const r = await api.post('/api/carrito/fusionar', { lineas: [
    linea('no-existe', 'frasco', 50, 1),
    linea('asad', 'frasco', 50, '2'),
    linea('yara', 'frasco', 50, -1)
  ] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, [linea('asad', 'frasco', 50, 2)]);
});

test('fusionar suma a lo guardado y respeta el máximo de decants', async () => {
  const api = await conSesion();
  await api.put('/api/carrito', { lineas: [linea('khamrah', 'decant', 5, 9)] });
  const r = await api.post('/api/carrito/fusionar', { lineas: [linea('khamrah', 'decant', 5, 3)] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, [linea('khamrah', 'decant', 5, 10)]);
  assert.deepEqual((await api.get('/api/carrito')).cuerpo, r.cuerpo);
});

test('lineas que no es un arreglo responde 400', async () => {
  const api = await conSesion();
  for (const [m, ruta] of [['put', '/api/carrito'], ['post', '/api/carrito/fusionar']]){
    for (const cuerpo of [{}, { lineas: 'x' }, { lineas: { a: 1 } }, { lineas: null }]){
      const r = await api[m](ruta, cuerpo);
      assert.equal(r.status, 400);
      assert.equal(r.cuerpo.error, ERROR_LECTURA);
    }
  }
});

test('las entradas malformadas se descartan sin romper nada', async () => {
  const api = await conSesion();
  const r = await api.put('/api/carrito', { lineas: [null, 'texto', 7, [], {}, { id: 'asad' }, { id: 5, kind: 'frasco', ml: 50, qty: 1 },
    linea('asad', 'otro', 50, 1), linea('asad', 'frasco', 'abc', 1), linea('asad', 'frasco', 50.5, 1), linea('asad', 'frasco', 50, 'x'),
    linea('asad', 'frasco', 50, 0), linea('asad', 'frasco', 50, 1.9)] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, [linea('asad', 'frasco', 50, 1)]);
});

test('un perfume inactivo cuenta como inexistente y una presentación sin stock se descarta', async () => {
  /* Dentro de una transacción que se deshace, para no tocar datos que usan otras pruebas */
  const c = await app.pool.connect();
  try{
    await c.query('BEGIN');
    await c.query("UPDATE Producto SET Pro_activo = false WHERE Pro_slug = 'asad'");
    await c.query("UPDATE Presentacion SET Pre_stock = 0 WHERE Pro_id = (SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara') AND Pre_tipo = 'frasco' AND Pre_ml = 50");
    const r = await sanearLineas(c, [linea('asad', 'frasco', 50, 1), linea('yara', 'frasco', 50, 2), linea('khamrah', 'frasco', 100, 1)]);
    assert.deepEqual(r.map(({ preId, ...resto }) => resto), [linea('khamrah', 'frasco', 100, 1)]);
  }finally{
    await c.query('ROLLBACK');
    c.release();
  }
});

test('sanearLineas devuelve preId y acepta un pool sin lanzar con basura', async () => {
  const r = await sanearLineas(app.pool, [linea('asad', 'frasco', 50, 1), null, 'x']);
  assert.equal(r.length, 1);
  assert.equal(typeof r[0].preId, 'number');
  assert.deepEqual(await sanearLineas(app.pool, undefined), []);
});
