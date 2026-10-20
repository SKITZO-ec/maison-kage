/* Pruebas de las direcciones de envío */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarApp, cliente } from './ayuda.mjs';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app.cerrar(); });

let n = 0;
async function conSesion(){
  const api = cliente(app.base);
  const r = await api.post('/api/registro', { nombre: 'Ana', apellido: 'Ruiz', correo: `dir${Date.now()}${n++}@prueba.com`, telefono: '0991234567', clave: 'secreta123' });
  assert.equal(r.status, 201);
  return api;
}
const dir = (extra = {}) => ({ alias: 'Casa', dir: 'Av. Amazonas N24-15 y Colón', ciudad: 'Quito', ref: 'Edificio azul', tel: '0991234567', ...extra });

test('sin sesión todas las rutas responden 401', async () => {
  const api = cliente(app.base);
  for (const [m, ruta, cuerpo] of [['get', '/api/direcciones'], ['post', '/api/direcciones', dir()], ['patch', '/api/direcciones/1', { principal: true }], ['del', '/api/direcciones/1']]){
    const r = await api[m](ruta, cuerpo);
    assert.equal(r.status, 401, `${m} ${ruta}`);
    assert.equal(r.cuerpo.error, 'Inicia sesión para continuar.');
  }
});

test('la primera dirección queda principal y devuelve la forma del sitio', async () => {
  const api = await conSesion();
  const r = await api.post('/api/direcciones', dir());
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.cuerpo).sort(), ['alias', 'ciudad', 'dir', 'id', 'principal', 'ref', 'tel']);
  assert.equal(typeof r.cuerpo.id, 'number');
  assert.equal(r.cuerpo.principal, true);
  assert.equal(r.cuerpo.ref, 'Edificio azul');
  const r2 = await api.post('/api/direcciones', dir({ alias: 'Oficina' }));
  assert.equal(r2.cuerpo.principal, false);
});

test('la referencia es opcional, se guarda como NULL y vuelve como cadena vacía', async () => {
  const api = await conSesion();
  const r = await api.post('/api/direcciones', dir({ ref: '   ' }));
  assert.equal(r.status, 201);
  assert.equal(r.cuerpo.ref, '');
  const { rows } = await app.pool.query('SELECT Dir_referencia FROM Direccion WHERE Dir_id = $1', [r.cuerpo.id]);
  assert.equal(rows[0].dir_referencia, null);
  const sin = await api.post('/api/direcciones', (({ ref, ...resto }) => resto)(dir()));
  assert.equal(sin.status, 201);
  assert.equal(sin.cuerpo.ref, '');
});

test('GET lista con la principal primero y luego las más antiguas', async () => {
  const api = await conSesion();
  const a = (await api.post('/api/direcciones', dir({ alias: 'A' }))).cuerpo;
  const b = (await api.post('/api/direcciones', dir({ alias: 'B' }))).cuerpo;
  const c = (await api.post('/api/direcciones', dir({ alias: 'C' }))).cuerpo;
  let lista = (await api.get('/api/direcciones')).cuerpo;
  assert.deepEqual(lista.map(x => x.id), [a.id, b.id, c.id]);
  const r = await api.patch(`/api/direcciones/${c.id}`, { principal: true });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo.map(x => x.id), [c.id, a.id, b.id]);
  assert.equal(r.cuerpo.filter(x => x.principal).length, 1);
  lista = (await api.get('/api/direcciones')).cuerpo;
  assert.deepEqual(lista.map(x => x.principal), [true, false, false]);
});

test('borrar la principal deja principal a la siguiente más antigua', async () => {
  const api = await conSesion();
  const a = (await api.post('/api/direcciones', dir({ alias: 'A' }))).cuerpo;
  const b = (await api.post('/api/direcciones', dir({ alias: 'B' }))).cuerpo;
  const c = (await api.post('/api/direcciones', dir({ alias: 'C' }))).cuerpo;
  const r = await api.del(`/api/direcciones/${a.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo.map(x => [x.id, x.principal]), [[b.id, true], [c.id, false]]);
  /* Borrar una que no es principal no cambia la principal */
  const r2 = await api.del(`/api/direcciones/${c.id}`);
  assert.deepEqual(r2.cuerpo.map(x => [x.id, x.principal]), [[b.id, true]]);
  const r3 = await api.del(`/api/direcciones/${b.id}`);
  assert.deepEqual(r3.cuerpo, []);
});

test('ciudad fuera de la lista, teléfono inválido y campos vacíos responden 400', async () => {
  const api = await conSesion();
  let r = await api.post('/api/direcciones', dir({ ciudad: 'Atlantis' }));
  assert.equal(r.status, 400);
  assert.ok(r.cuerpo.error);
  r = await api.post('/api/direcciones', dir({ tel: '12345' }));
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'Escribe un celular de 10 dígitos que empiece con 09.');
  r = await api.post('/api/direcciones', dir({ tel: '' }));
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'Completa el campo Celular.');
  r = await api.post('/api/direcciones', dir({ alias: '' }));
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'Completa el campo Nombre de la dirección.');
  r = await api.post('/api/direcciones', dir({ dir: 'x'.repeat(161) }));
  assert.equal(r.status, 400);
  r = await api.post('/api/direcciones', dir({ ref: 'x'.repeat(161) }));
  assert.equal(r.status, 400);
  assert.deepEqual((await api.get('/api/direcciones')).cuerpo, []);
});

test('un usuario no puede cambiar ni borrar la dirección de otro', async () => {
  const dueno = await conSesion();
  const otro = await conSesion();
  const d = (await dueno.post('/api/direcciones', dir())).cuerpo;
  for (const r of [await otro.patch(`/api/direcciones/${d.id}`, { principal: true }), await otro.del(`/api/direcciones/${d.id}`), await otro.del('/api/direcciones/abc'), await otro.del('/api/direcciones/999999999')]){
    assert.equal(r.status, 404);
    assert.equal(r.cuerpo.error, 'No encontramos esa dirección.');
  }
  assert.equal((await dueno.get('/api/direcciones')).cuerpo.length, 1);
  assert.deepEqual((await otro.get('/api/direcciones')).cuerpo, []);
});

test('PATCH solo acepta principal true', async () => {
  const api = await conSesion();
  const d = (await api.post('/api/direcciones', dir())).cuerpo;
  const r = await api.patch(`/api/direcciones/${d.id}`, { principal: false });
  assert.equal(r.status, 400);
});
