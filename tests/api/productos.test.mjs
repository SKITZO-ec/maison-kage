/* Pruebas de la API del catálogo y de lo que el servidor publica */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarApp, cliente } from './ayuda.mjs';

let app, api;
before(async () => { app = await iniciarApp(); api = cliente(app.base); });
after(async () => { await app.cerrar(); });

test('GET /api/productos devuelve los 70 perfumes', async () => {
  const { status, cuerpo } = await api.get('/api/productos');
  assert.equal(status, 200);
  assert.equal(cuerpo.length, 70);
  const khamrah = cuerpo.find(p => p.id === 'khamrah');
  assert.equal(khamrah.pres.length, 5);
});

test('GET /api/productos/:slug devuelve un perfume', async () => {
  const { status, cuerpo } = await api.get('/api/productos/khamrah');
  assert.equal(status, 200);
  assert.equal(cuerpo.nombre, 'Khamrah');
});

test('GET /api/productos/:slug responde 404 si no existe', async () => {
  const { status, cuerpo } = await api.get('/api/productos/no-existe');
  assert.equal(status, 404);
  assert.equal(cuerpo.error, 'No encontramos ese perfume.');
});

test('el servidor no publica archivos internos', async () => {
  for (const ruta of ['/.env', '/backend/app.js', '/database/maisonkage.sql', '/tests/.tw.css', '/package.json']) {
    const { status } = await api.get(ruta);
    assert.equal(status, 404, ruta);
  }
});

test('la base de pruebas tiene 70 perfumes y cada categoría al menos 10', async () => {
  const { rows } = await app.pool.query('SELECT COUNT(*)::INT AS n FROM Producto');
  assert.equal(rows[0].n, 70);
  const { rows: cat } = await app.pool.query(`
    SELECT * FROM (
      SELECT 'Público ' || Pro_publico AS categoria, COUNT(*)::INT AS perfumes FROM Producto GROUP BY Pro_publico
      UNION ALL SELECT 'Origen ' || Pro_origen, COUNT(*) FROM Producto GROUP BY Pro_origen
      UNION ALL SELECT 'Familia ' || F.Fam_nombre, COUNT(*) FROM Producto P JOIN Familia F ON F.Fam_id = P.Fam_id GROUP BY F.Fam_nombre
      UNION ALL SELECT 'Ocasión ' || O.Oca_nombre, COUNT(*) FROM ProductoOcasion R JOIN Ocasion O ON O.Oca_id = R.Oca_id GROUP BY O.Oca_nombre
      UNION ALL SELECT 'Concentración ' || Pro_concentracion, COUNT(*) FROM Producto GROUP BY Pro_concentracion
      UNION ALL SELECT 'Ofertas', COUNT(*) FROM Producto WHERE Pro_oferta > 0
      UNION ALL SELECT 'Novedades', COUNT(*) FROM Producto WHERE Pro_novedad
      UNION ALL SELECT 'Más vendidos', COUNT(*) FROM Producto WHERE Pro_mas_vendido
      UNION ALL SELECT 'Decants', COUNT(DISTINCT Pro_id) FROM Presentacion WHERE Pre_tipo = 'decant'
    ) C ORDER BY perfumes`);
  assert.equal(cat.length, 27);
  for (const c of cat) assert.ok(c.perfumes >= 10, `${c.categoria} tiene ${c.perfumes}`);
});

test('si la base no responde, la API da un 503 sin detalles internos', async () => {
  const sinBd = await iniciarApp({ bd: { database: 'no_existe_mk' } });
  try {
    const { status, cuerpo } = await cliente(sinBd.base).get('/api/productos');
    assert.equal(status, 503);
    assert.equal(cuerpo.error, 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.');
    const texto = JSON.stringify(cuerpo);
    assert.ok(!texto.includes('postgres'));
    assert.ok(!texto.includes('at '));
  } finally { await sinBd.cerrar(); }
});
