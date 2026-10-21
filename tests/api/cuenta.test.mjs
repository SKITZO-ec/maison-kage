/* Pruebas de registro, login, logout, perfil, CSRF y límite de intentos */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarApp, cliente } from './ayuda.mjs';

let app;
before(async () => { app = await iniciarApp(); });
after(async () => { await app.cerrar(); });

let n = 0;
const correoNuevo = () => `cuenta${Date.now()}${n++}@prueba.com`;
const datos = (extra = {}) => ({ nombre: 'Ana', apellido: 'Ruiz', correo: correoNuevo(), telefono: '0991234567', clave: 'secreta123', ...extra });

/* Devuelve la línea Set-Cookie cruda de mk_sesion */
async function cookieSesionCruda(cuerpo){
  const bruto = await fetch(app.base + '/api/yo');
  const csrf = /mk_csrf=([^;]+)/.exec(bruto.headers.getSetCookie().join('\n'))[1];
  const r = await fetch(app.base + '/api/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `mk_csrf=${csrf}`, 'X-CSRF': csrf },
    body: JSON.stringify(cuerpo)
  });
  return { r, lineas: r.headers.getSetCookie() };
}

test('registro válido responde 201, abre sesión con cookie segura y GET /api/yo da el nombre', async () => {
  const api = cliente(app.base);
  const d = datos();
  const { r, lineas } = await cookieSesionCruda(d);
  assert.equal(r.status, 201);
  const sesion = lineas.find(l => l.startsWith('mk_sesion='));
  assert.match(sesion, /HttpOnly/i);
  assert.match(sesion, /SameSite=Lax/i);
  assert.doesNotMatch(sesion, /Secure/i);

  const c = await api.post('/api/registro', datos({ nombre: 'Lucía' }));
  assert.equal(c.status, 201);
  const yo = await api.get('/api/yo');
  assert.equal(yo.status, 200);
  assert.equal(yo.cuerpo.nombre, 'Lucía');
  assert.equal(yo.cuerpo.apellido, 'Ruiz');
  assert.equal(yo.cuerpo.telefono, '0991234567');
});

test('la cookie mk_csrf se puede leer desde JavaScript y es de 32 bytes en hex', async () => {
  const r = await fetch(app.base + '/api/yo');
  const linea = r.headers.getSetCookie().find(l => l.startsWith('mk_csrf='));
  assert.match(linea, /^mk_csrf=[0-9a-f]{64};/);
  assert.match(linea, /SameSite=Lax/i);
  assert.doesNotMatch(linea, /HttpOnly/i);
});

test('GET /api/yo sin sesión responde 200 con null', async () => {
  const api = cliente(app.base);
  const yo = await api.get('/api/yo');
  assert.equal(yo.status, 200);
  assert.equal(yo.cuerpo, null);
});

test('la clave se guarda con bcrypt y nunca en texto plano', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const { rows } = await app.pool.query('SELECT Usu_clave FROM Usuario WHERE Usu_correo = $1', [d.correo]);
  assert.match(rows[0].usu_clave, /^\$2/);
  assert.ok(!rows[0].usu_clave.includes(d.clave));
});

test('el token de sesión se guarda como SHA-256 y no el código de la cookie', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const { rows } = await app.pool.query(
    'SELECT S.Ses_token_hash, S.Ses_vence > NOW() + interval \'6 days\' AS larga FROM Sesion S JOIN Usuario U ON U.Usu_id = S.Usu_id WHERE U.Usu_correo = $1', [d.correo]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].ses_token_hash, /^[0-9a-f]{64}$/);
  assert.equal(rows[0].larga, true);
});

test('el correo se normaliza y uno repetido responde 409', async () => {
  const api = cliente(app.base);
  const base = correoNuevo();
  const r1 = await api.post('/api/registro', datos({ correo: ` ${base.replace('cuenta', 'Cuenta').toUpperCase().replace('@PRUEBA.COM', '@Prueba.com')} ` }));
  assert.equal(r1.status, 201);
  const otro = cliente(app.base);
  const r2 = await otro.post('/api/registro', datos({ correo: base.toUpperCase() }));
  assert.equal(r2.status, 409);
  assert.equal(r2.cuerpo.error, 'Ya existe una cuenta con este correo. Inicia sesión.');
  const entrada = cliente(app.base);
  const l = await entrada.post('/api/login', { correo: base, clave: 'secreta123' });
  assert.equal(l.status, 200);
});

test('login con clave equivocada y con correo inexistente dan el mismo 401', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const otro = cliente(app.base);
  const a = await otro.post('/api/login', { correo: d.correo, clave: 'equivocada1' });
  const b = await otro.post('/api/login', { correo: correoNuevo(), clave: 'equivocada1' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.cuerpo.error, 'El correo o la contraseña no son correctos.');
  assert.deepEqual(a.cuerpo, b.cuerpo);
});

test('un teléfono inválido responde 400 con el mensaje del formulario', async () => {
  const api = cliente(app.base);
  const r = await api.post('/api/registro', datos({ telefono: '0812345678' }));
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'Escribe un celular de 10 dígitos que empiece con 09.');
});

test('el teléfono es opcional al registrarse', async () => {
  const api = cliente(app.base);
  const r = await api.post('/api/registro', datos({ telefono: '' }));
  assert.equal(r.status, 201);
  assert.equal((await api.get('/api/yo')).cuerpo.telefono, null);
});

test('el apellido es opcional al registrarse y se guarda vacío', async () => {
  for (const extra of [{ apellido: '' }, { apellido: '   ' }, { apellido: undefined }, { apellido: null }]){
    const api = cliente(app.base);
    const r = await api.post('/api/registro', datos(extra));
    assert.equal(r.status, 201, JSON.stringify(extra));
    assert.equal(r.cuerpo.apellido, '');
    assert.equal((await api.get('/api/yo')).cuerpo.apellido, '');
  }
  const largo = await cliente(app.base).post('/api/registro', datos({ apellido: 'x'.repeat(61) }));
  assert.equal(largo.status, 400);
  assert.equal(largo.cuerpo.error, 'El campo Apellido no puede tener más de 60 caracteres.');
  const raro = await cliente(app.base).post('/api/registro', datos({ apellido: 5 }));
  assert.equal(raro.status, 400);
  assert.equal(raro.cuerpo.error, 'El campo Apellido no es válido.');
});

test('el perfil puede dejar el apellido vacío pero no el nombre', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const r = await api.patch('/api/yo', { nombre: 'Ana', apellido: '', correo: d.correo });
  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.apellido, '');
  assert.equal((await api.get('/api/yo')).cuerpo.apellido, '');
  const sinNombre = await api.patch('/api/yo', { nombre: '', apellido: 'Ruiz' });
  assert.equal(sinNombre.status, 400);
  assert.equal(sinNombre.cuerpo.error, 'Completa el campo Nombre.');
});

test('una clave de 7 caracteres responde 400 y faltan campos obligatorios', async () => {
  const api = cliente(app.base);
  const r = await api.post('/api/registro', datos({ clave: '1234567' }));
  assert.equal(r.status, 400);
  assert.equal(r.cuerpo.error, 'La contraseña debe tener al menos 8 caracteres.');
  const s = await api.post('/api/registro', datos({ nombre: '  ' }));
  assert.equal(s.status, 400);
  assert.equal(s.cuerpo.error, 'Completa el campo Nombre.');
  const c = await api.post('/api/registro', datos({ correo: 'sin-arroba' }));
  assert.equal(c.cuerpo.error, 'Escribe un correo válido, por ejemplo nombre@correo.com.');
});

test('un cuerpo que no es JSON válido responde 400 en JSON', async () => {
  const api = cliente(app.base);
  await api.get('/api/yo');
  const r = await fetch(app.base + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'mk_csrf=a', 'X-CSRF': 'a' }, body: '{roto'
  });
  assert.equal(r.status, 400);
  assert.equal(typeof (await r.json()).error, 'string');
});

test('un POST sin X-CSRF responde 403', async () => {
  const r = await fetch(app.base + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: 'a@b.com', clave: 'x' })
  });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error, 'Tu sesión de seguridad venció. Recarga la página e intenta de nuevo.');
  const mal = await fetch(app.base + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'mk_csrf=abc', 'X-CSRF': 'abd' }, body: '{}'
  });
  assert.equal(mal.status, 403);
});

test('una escritura bajo /API o /Api sin X-CSRF también responde 403', async () => {
  for (const [metodo, ruta] of [['POST', '/API/logout'], ['POST', '/Api/login'], ['PATCH', '/Api/yo'], ['PUT', '/aPi/yo/clave'], ['DELETE', '/API/x']]){
    const r = await fetch(app.base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: metodo === 'DELETE' ? undefined : '{}' });
    assert.equal(r.status, 403, `${metodo} ${ruta}`);
  }
});

test('logout borra la fila de Sesion y la cookie anterior ya no da usuario', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const antes = await app.pool.query('SELECT COUNT(*)::int AS n FROM Sesion S JOIN Usuario U ON U.Usu_id = S.Usu_id WHERE U.Usu_correo = $1', [d.correo]);
  assert.equal(antes.rows[0].n, 1);
  const out = await api.post('/api/logout');
  assert.equal(out.status, 204);
  const despues = await app.pool.query('SELECT COUNT(*)::int AS n FROM Sesion S JOIN Usuario U ON U.Usu_id = S.Usu_id WHERE U.Usu_correo = $1', [d.correo]);
  assert.equal(despues.rows[0].n, 0);
  assert.equal((await api.get('/api/yo')).cuerpo, null);
});

test('una cookie vieja no sirve después del logout', async () => {
  const d = datos();
  const { lineas } = await cookieSesionCruda(d);
  const vieja = /mk_sesion=([^;]+)/.exec(lineas.join('\n'))[1];
  const ok = await fetch(app.base + '/api/yo', { headers: { Cookie: `mk_sesion=${vieja}` } });
  assert.equal((await ok.json()).correo, d.correo);
  const otro = cliente(app.base);
  await otro.post('/api/login', { correo: d.correo, clave: d.clave });
  await otro.post('/api/logout');
  /* El logout del otro cliente solo cerró su propia sesión */
  const sigue = await fetch(app.base + '/api/yo', { headers: { Cookie: `mk_sesion=${vieja}` } });
  assert.equal((await sigue.json()).correo, d.correo);
  await app.pool.query('DELETE FROM Sesion WHERE Usu_id = (SELECT Usu_id FROM Usuario WHERE Usu_correo = $1)', [d.correo]);
  const muerta = await fetch(app.base + '/api/yo', { headers: { Cookie: `mk_sesion=${vieja}` } });
  assert.equal(await muerta.json(), null);
});

test('una sesión vencida no da usuario', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  await app.pool.query(`UPDATE Sesion SET Ses_creada = NOW() - interval '8 days', Ses_vence = NOW() - interval '1 day'
                         WHERE Usu_id = (SELECT Usu_id FROM Usuario WHERE Usu_correo = $1)`, [d.correo]);
  assert.equal((await api.get('/api/yo')).cuerpo, null);
});

test('cambiar el correo exige la contraseña actual y cierra las demás sesiones', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const otraSesion = cliente(app.base);
  await otraSesion.post('/api/login', { correo: d.correo, clave: d.clave });
  const nuevo = correoNuevo();
  const sin = await api.patch('/api/yo', { nombre: 'Ana', apellido: 'Ruiz', telefono: '0991234567', correo: nuevo });
  assert.equal(sin.status, 400);
  assert.equal(sin.cuerpo.error, 'La contraseña actual no es correcta.');
  const mala = await api.patch('/api/yo', { nombre: 'Ana', apellido: 'Ruiz', telefono: '0991234567', correo: nuevo, claveActual: 'otra-clave' });
  assert.equal(mala.status, 400);
  assert.equal(mala.cuerpo.error, 'La contraseña actual no es correcta.');
  const bien = await api.patch('/api/yo', { nombre: 'Ana María', apellido: 'Ruiz', telefono: '', correo: ` ${nuevo.toUpperCase()} `, claveActual: d.clave });
  assert.equal(bien.status, 200);
  assert.equal(bien.cuerpo.correo, nuevo);
  assert.equal(bien.cuerpo.nombre, 'Ana María');
  assert.equal(bien.cuerpo.telefono, null);
  assert.equal((await api.get('/api/yo')).cuerpo.correo, nuevo);
  assert.equal((await otraSesion.get('/api/yo')).cuerpo, null);
  const entrada = cliente(app.base);
  assert.equal((await entrada.post('/api/login', { correo: nuevo, clave: d.clave })).status, 200);
});

test('no se puede tomar el correo de otra cuenta', async () => {
  const a = cliente(app.base), b = cliente(app.base);
  const da = datos(), db = datos();
  await a.post('/api/registro', da);
  await b.post('/api/registro', db);
  const r = await b.patch('/api/yo', { correo: da.correo, claveActual: db.clave });
  assert.equal(r.status, 409);
  assert.equal(r.cuerpo.error, 'Ya existe una cuenta con ese correo.');
});

test('el perfil sin cambiar el correo no pide contraseña y exige sesión', async () => {
  const api = cliente(app.base);
  const sin = await api.patch('/api/yo', { nombre: 'X' });
  assert.equal(sin.status, 401);
  assert.equal(sin.cuerpo.error, 'Inicia sesión para continuar.');
  const d = datos();
  await api.post('/api/registro', d);
  const r = await api.patch('/api/yo', { nombre: 'Berta', apellido: 'Paz', telefono: '0987654321', correo: d.correo });
  assert.equal(r.status, 200);
  assert.deepEqual(r.cuerpo, { nombre: 'Berta', apellido: 'Paz', correo: d.correo, telefono: '0987654321' });
});

test('PUT /api/yo/clave valida la actual y el login funciona con la nueva', async () => {
  const api = cliente(app.base);
  const d = datos();
  await api.post('/api/registro', d);
  const mala = await api.put('/api/yo/clave', { actual: 'incorrecta1', nueva: 'nuevaclave1' });
  assert.equal(mala.status, 400);
  assert.equal(mala.cuerpo.error, 'La contraseña actual no es correcta.');
  const corta = await api.put('/api/yo/clave', { actual: d.clave, nueva: 'corta' });
  assert.equal(corta.status, 400);
  const ok = await api.put('/api/yo/clave', { actual: d.clave, nueva: 'nuevaclave1' });
  assert.equal(ok.status, 200);
  const viejo = await cliente(app.base).post('/api/login', { correo: d.correo, clave: d.clave });
  assert.equal(viejo.status, 401);
  const nuevo = await cliente(app.base).post('/api/login', { correo: d.correo, clave: 'nuevaclave1' });
  assert.equal(nuevo.status, 200);
});

test('el sexto POST /api/login en 15 minutos responde 429', async () => {
  const limitada = await iniciarApp({ limiteIntentos: 5 });
  try{
    const api = cliente(limitada.base);
    for (let i = 0; i < 5; i++){
      const r = await api.post('/api/login', { correo: 'nadie@prueba.com', clave: 'equivocada1' });
      assert.equal(r.status, 401);
    }
    const sexto = await api.post('/api/login', { correo: 'nadie@prueba.com', clave: 'equivocada1' });
    assert.equal(sexto.status, 429);
    assert.equal(sexto.cuerpo.error, 'Demasiados intentos, espera unos minutos');
  }finally{
    await limitada.cerrar();
  }
});
