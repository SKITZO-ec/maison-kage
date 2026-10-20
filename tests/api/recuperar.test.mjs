/* Pruebas de la recuperación de contraseña por correo */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { iniciarApp, cliente } from './ayuda.mjs';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app.cerrar(); });

let n = 0;
const correoNuevo = () => `recuperar${Date.now()}${n++}@prueba.com`;

async function crearCuenta(clave = 'secreta123'){
  const api = cliente(app.base);
  const correo = correoNuevo();
  const r = await api.post('/api/registro', { nombre: 'Ana', apellido: 'Ruiz', correo, clave });
  assert.equal(r.status, 201);
  return { api, correo };
}

/* Pide el enlace y devuelve el código de 64 caracteres del último correo */
async function pedirCodigo(correo){
  const r = await cliente(app.base).post('/api/recuperar', { correo });
  assert.equal(r.status, 200);
  const correos = app.correo.bandeja.filter(c => c.para === correo);
  const m = /recuperar\.html\?codigo=([0-9a-f]{64})/.exec(correos.at(-1).texto);
  assert.ok(m, 'el correo debe traer el enlace');
  return m[1];
}

test('pedir con un correo registrado y con uno inexistente responde igual, y solo el registrado recibe correo', async () => {
  const { correo } = await crearCuenta();
  const fantasma = correoNuevo();
  const a = await cliente(app.base).post('/api/recuperar', { correo });
  const b = await cliente(app.base).post('/api/recuperar', { correo: fantasma });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.deepEqual(a.cuerpo, b.cuerpo);
  assert.equal(a.cuerpo.mensaje, 'Si el correo tiene una cuenta, te enviamos un enlace');
  assert.equal(app.correo.bandeja.filter(c => c.para === correo).length, 1);
  assert.equal(app.correo.bandeja.filter(c => c.para === fantasma).length, 0);
});

test('un correo mal escrito también responde 200 con el mismo mensaje', async () => {
  const r = await cliente(app.base).post('/api/recuperar', { correo: 'no-es-correo' });
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.mensaje, 'Si el correo tiene una cuenta, te enviamos un enlace');
});

test('el correo trae el enlace con URL_BASE, el aviso de 30 minutos y la nota de ignorar', async () => {
  const { correo } = await crearCuenta();
  await pedirCodigo(correo);
  const c = app.correo.bandeja.filter(x => x.para === correo).at(-1);
  assert.match(c.texto, new RegExp(app.base.replace(/[.:/]/g, '\\$&') + '/recuperar\\.html\\?codigo=[0-9a-f]{64}'));
  assert.match(c.texto, /vence en 30 minutos/);
  assert.match(c.texto, /Si no pediste este cambio, ignora este correo/);
  assert.match(c.html, /recuperar\.html\?codigo=[0-9a-f]{64}/);
  assert.ok(c.asunto.length > 0);
});

test('en la base el código se guarda como SHA-256 y no tal cual', async () => {
  const { correo } = await crearCuenta();
  const codigo = await pedirCodigo(correo);
  const { rows } = await app.pool.query(
    `SELECT R.Rec_token_hash FROM RecuperacionClave R JOIN Usuario U ON U.Usu_id = R.Usu_id WHERE U.Usu_correo = $1`, [correo]);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].rec_token_hash, codigo);
  assert.equal(rows[0].rec_token_hash, crypto.createHash('sha256').update(codigo).digest('hex'));
});

test('usar el código cambia la clave, el login nuevo funciona y las sesiones anteriores caen', async () => {
  const { api, correo } = await crearCuenta();
  assert.notEqual((await api.get('/api/yo')).cuerpo, null);
  const codigo = await pedirCodigo(correo);
  const r = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: 'nuevaClave456' });
  assert.equal(r.status, 200);
  assert.equal((await api.get('/api/yo')).cuerpo, null);
  const viejo = await cliente(app.base).post('/api/login', { correo, clave: 'secreta123' });
  assert.equal(viejo.status, 401);
  const nuevo = await cliente(app.base).post('/api/login', { correo, clave: 'nuevaClave456' });
  assert.equal(nuevo.status, 200);
});

test('usar el mismo código dos veces responde 400 la segunda', async () => {
  const { correo } = await crearCuenta();
  const codigo = await pedirCodigo(correo);
  const a = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: 'nuevaClave456' });
  assert.equal(a.status, 200);
  const b = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: 'otraClave789' });
  assert.equal(b.status, 400);
  assert.equal(b.cuerpo.error, 'El enlace venció o ya se usó. Pide uno nuevo.');
});

test('un código vencido responde 400', async () => {
  const { correo } = await crearCuenta();
  const codigo = await pedirCodigo(correo);
  await app.pool.query(
    `UPDATE RecuperacionClave SET Rec_vence = NOW() - interval '1 minute'
      WHERE Usu_id = (SELECT Usu_id FROM Usuario WHERE Usu_correo = $1)`, [correo]);
  const r = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: 'nuevaClave456' });
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'El enlace venció o ya se usó. Pide uno nuevo.');
});

test('un código inventado responde 400', async () => {
  const r = await cliente(app.base).post('/api/recuperar/' + 'a'.repeat(64), { clave: 'nuevaClave456' });
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'El enlace venció o ya se usó. Pide uno nuevo.');
});

test('una clave de 7 caracteres responde 400 y no gasta el código', async () => {
  const { correo } = await crearCuenta();
  const codigo = await pedirCodigo(correo);
  const corta = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: '1234567' });
  assert.equal(corta.status, 400);
  assert.equal(corta.cuerpo.error, 'La contraseña debe tener al menos 8 caracteres.');
  const buena = await cliente(app.base).post('/api/recuperar/' + codigo, { clave: 'nuevaClave456' });
  assert.equal(buena.status, 200);
});

test('la ruta de prueba devuelve los correos del destinatario en modo de pruebas', async () => {
  const { correo } = await crearCuenta();
  await pedirCodigo(correo);
  const r = await cliente(app.base).get('/api/_prueba/correos?para=' + encodeURIComponent(correo));
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.length, 1);
  assert.deepEqual(Object.keys(r.cuerpo[0]).sort(), ['asunto', 'html', 'para', 'texto']);
  assert.equal(r.cuerpo[0].para, correo);
});

test('fuera del modo de pruebas la ruta de prueba responde 404 en JSON', async () => {
  const otra = await iniciarApp({ nodeEnv: 'development' });
  try{
    const r = await cliente(otra.base).get('/api/_prueba/correos?para=x@y.com');
    assert.equal(r.status, 404);
    assert.ok(r.cuerpo.error);
  }finally{ await otra.cerrar(); }
});
