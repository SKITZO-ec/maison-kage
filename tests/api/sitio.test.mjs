/* Pruebas de /js/sesion.js, el script con la sesión que cargan todas las páginas */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { iniciarApp, cliente } from './ayuda.mjs';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app?.cerrar(); });

let n = 0;
async function conSesion(nombre = 'Ana'){
  const api = cliente(app.base);
  const r = await api.post('/api/registro', { nombre, apellido: 'Ruiz', correo: `sitio${Date.now()}${n++}@prueba.com`, telefono: '0991234567', clave: 'secreta123' });
  assert.equal(r.status, 201);
  return api;
}
/* Ejecuta el script como lo haría el navegador y devuelve SESION.
   El objeto viene de otro contexto de vm, por eso se copia antes de compararlo */
const leer = codigo => JSON.parse(JSON.stringify(vm.runInNewContext(codigo + '\nSESION')));

test('sin sesión responde el script con usuario null y sin guardar en caché', async () => {
  const r = await cliente(app.base).get('/js/sesion.js');
  assert.equal(r.status, 200);
  assert.match(r.cabeceras.get('content-type'), /javascript/);
  assert.equal(r.cabeceras.get('cache-control'), 'no-store');
  assert.match(r.cuerpo, /usuario: null/);
  assert.deepEqual(leer(r.cuerpo), { usuario: null, favoritos: [], direcciones: [], carrito: [] });
});

test('con sesión trae el usuario, los favoritos y las direcciones', async () => {
  const api = await conSesion();
  assert.equal((await api.put('/api/favoritos/khamrah')).status, 200);
  assert.equal((await api.post('/api/direcciones', { alias: 'Casa', dir: 'Av. Amazonas', ciudad: 'Quito', tel: '0991234567' })).status, 201);
  const r = await api.get('/js/sesion.js');
  assert.equal(r.cabeceras.get('cache-control'), 'no-store');
  assert.match(r.cuerpo, /"nombre":"Ana"/);
  const s = leer(r.cuerpo);
  assert.equal(s.usuario.nombre, 'Ana');
  assert.equal(s.usuario.apellido, 'Ruiz');
  assert.match(s.usuario.correo, /^sitio/);
  assert.equal(s.usuario.telefono, '0991234567');
  assert.equal(s.usuario.id, undefined);
  assert.deepEqual(s.favoritos, ['khamrah']);
  assert.equal(s.direcciones.length, 1);
  assert.equal(s.direcciones[0].alias, 'Casa');
  assert.equal(s.direcciones[0].principal, true);
});

test('con sesión trae el carrito guardado tal como está en la base', async () => {
  const api = await conSesion();
  assert.equal((await api.put('/api/carrito', { lineas: [{ id: 'asad', kind: 'decant', ml: 5, qty: 2 }, { id: 'khamrah', kind: 'frasco', ml: 50, qty: 1 }] })).status, 200);
  const s = leer((await api.get('/js/sesion.js')).cuerpo);
  assert.deepEqual(s.carrito, [{ id: 'asad', kind: 'decant', ml: 5, qty: 2 }, { id: 'khamrah', kind: 'frasco', ml: 50, qty: 1 }]);
  const otro = leer((await api.get('/js/sesion.js', { 'Sec-Fetch-Site': 'cross-site' })).cuerpo);
  assert.deepEqual(otro.carrito, []);
});

test('una petición de otro sitio recibe la versión sin sesión', async () => {
  const api = await conSesion();
  const r = await api.get('/js/sesion.js', { 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(r.status, 200);
  assert.match(r.cuerpo, /usuario: null/);
  assert.doesNotMatch(r.cuerpo, /Ana/);
  const mismo = await api.get('/js/sesion.js', { 'Sec-Fetch-Site': 'same-origin' });
  assert.match(mismo.cuerpo, /"nombre":"Ana"/);
});

test('un nombre con </script> o separadores de línea no rompe el script', async () => {
  const raro = 'Ana</script>\u2028\u2029x';
  const api = await conSesion(raro);
  const r = await api.get('/js/sesion.js');
  assert.doesNotMatch(r.cuerpo, /[\u2028\u2029]/);
  assert.equal(leer(r.cuerpo).usuario.nombre, raro);
});
