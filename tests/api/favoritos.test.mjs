/* Pruebas de los favoritos */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarApp, cliente } from './ayuda.mjs';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app.cerrar(); });

let n = 0;
async function conSesion(){
  const api = cliente(app.base);
  const r = await api.post('/api/registro', { nombre: 'Ana', apellido: 'Ruiz', correo: `fav${Date.now()}${n++}@prueba.com`, telefono: '0991234567', clave: 'secreta123' });
  assert.equal(r.status, 201);
  return api;
}

test('sin sesión todas las rutas responden 401', async () => {
  const api = cliente(app.base);
  for (const [m, ruta] of [['get', '/api/favoritos'], ['put', '/api/favoritos/khamrah'], ['del', '/api/favoritos/khamrah']]){
    const r = await api[m](ruta);
    assert.equal(r.status, 401, `${m} ${ruta}`);
    assert.equal(r.cuerpo.error, 'Inicia sesión para continuar.');
  }
});

test('PUT dos veces deja un solo favorito y responde la lista', async () => {
  const api = await conSesion();
  assert.deepEqual((await api.get('/api/favoritos')).cuerpo, []);
  const a = await api.put('/api/favoritos/khamrah');
  assert.equal(a.status, 200);
  assert.deepEqual(a.cuerpo, ['khamrah']);
  const b = await api.put('/api/favoritos/khamrah');
  assert.equal(b.status, 200);
  assert.deepEqual(b.cuerpo, ['khamrah']);
  const { rows } = await app.pool.query('SELECT COUNT(*)::int AS n FROM Favorito F JOIN Usuario U ON U.Usu_id = F.Usu_id WHERE U.Usu_correo LIKE $1', ['fav%']);
  assert.ok(rows[0].n >= 1);
});

test('la lista sale en el orden en que se guardaron y DELETE es idempotente', async () => {
  const api = await conSesion();
  const { rows } = await app.pool.query('SELECT Pro_slug FROM Producto WHERE Pro_activo ORDER BY Pro_id LIMIT 3');
  const [s1, s2, s3] = rows.map(r => r.pro_slug);
  await api.put(`/api/favoritos/${s3}`);
  await api.put(`/api/favoritos/${s1}`);
  const r = await api.put(`/api/favoritos/${s2}`);
  assert.deepEqual(r.cuerpo, [s3, s1, s2]);
  assert.deepEqual((await api.get('/api/favoritos')).cuerpo, [s3, s1, s2]);
  const d1 = await api.del(`/api/favoritos/${s1}`);
  assert.equal(d1.status, 200);
  assert.deepEqual(d1.cuerpo, [s3, s2]);
  const d2 = await api.del(`/api/favoritos/${s1}`);
  assert.equal(d2.status, 200);
  assert.deepEqual(d2.cuerpo, [s3, s2]);
});

test('un slug inexistente responde 404, también al quitarlo', async () => {
  const api = await conSesion();
  for (const r of [await api.put('/api/favoritos/no-existe'), await api.del('/api/favoritos/no-existe')]){
    assert.equal(r.status, 404);
    assert.equal(r.cuerpo.error, 'No encontramos ese perfume.');
  }
});

test('un perfume inactivo se trata como inexistente', async () => {
  const api = await conSesion();
  const { rows } = await app.pool.query('SELECT Pro_slug FROM Producto WHERE Pro_activo ORDER BY Pro_id DESC LIMIT 1');
  const slug = rows[0].pro_slug;
  await app.pool.query('UPDATE Producto SET Pro_activo = FALSE WHERE Pro_slug = $1', [slug]);
  try{
    const r = await api.put(`/api/favoritos/${slug}`);
    assert.equal(r.status, 404);
    assert.equal(r.cuerpo.error, 'No encontramos ese perfume.');
  }finally{
    await app.pool.query('UPDATE Producto SET Pro_activo = TRUE WHERE Pro_slug = $1', [slug]);
  }
});

test('cada usuario ve solo sus favoritos', async () => {
  const a = await conSesion();
  const b = await conSesion();
  await a.put('/api/favoritos/khamrah');
  assert.deepEqual((await b.get('/api/favoritos')).cuerpo, []);
});
