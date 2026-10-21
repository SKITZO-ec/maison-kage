// URLs limpias. /perfumes/<slug>, /ofertas y /decants abren la página que les toca
// y cada página funciona igual al abrirla directo en esas direcciones
const { test, expect, cuentaNueva } = require('../soporte/fixtures');

/* Junta las peticiones de archivos propios del sitio que fallaron.
   Las fotos de los perfumes todavía no existen, por eso no cuentan */
function fallidas(page) {
  const lista = [];
  page.on('response', r => {
    const u = new URL(r.url());
    if (u.origin === 'http://localhost:4174' && r.status() >= 400 && !u.pathname.startsWith('/source/img/productos/')) lista.push(r.status() + ' ' + u.pathname);
  });
  return lista;
}

test('/perfumes/khamrah abierto directo muestra la ficha con estilos y sin errores', async ({ page }) => {
  const malas = fallidas(page);
  const r = await page.goto('/perfumes/khamrah');
  expect(r.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('Khamrah');
  await expect(page).toHaveTitle(/Khamrah de Lattafa/);
  /* El CSS cargó si el cuerpo tiene el fondo marfil y no el blanco del navegador */
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await page.evaluate(() => typeof TW)).toBe('object');
  await page.waitForLoadState('networkidle');
  expect(malas).toEqual([]);
  expect(page.erroresConsola).toEqual([]);
});

test('ningún enlace ni archivo de /perfumes/khamrah apunta dentro de /perfumes/', async ({ page }) => {
  await page.goto('/perfumes/khamrah');
  await expect(page.locator('h1')).toHaveText('Khamrah');
  const malas = await page.evaluate(() => [...document.querySelectorAll('a[href], img[src], script[src], link[href], form[action]')]
    .map(el => new URL(el.href || el.src || el.action, location.href))
    .filter(u => u.origin === location.origin && u.pathname.startsWith('/perfumes/') && !/^\/perfumes\/[a-z0-9-]+$/.test(u.pathname))
    .map(u => u.pathname));
  expect(malas).toEqual([]);
});

test('/perfumes/no-existe responde 404 y muestra el buscador del 404', async ({ page }) => {
  const malas = fallidas(page);
  const r = await page.goto('/perfumes/no-existe');
  expect(r.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Esta página se evaporó');
  await expect(page.locator('#q404')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(malas).toEqual(['404 /perfumes/no-existe']);
  expect(page.erroresConsola).toEqual([]);
  /* El buscador del 404 lleva a la búsqueda de la raíz y no a /perfumes/buscar.html */
  await page.fill('#q404', 'oud');
  await page.press('#q404', 'Enter');
  await expect(page).toHaveURL(/^http:\/\/localhost:4174\/buscar\.html\?q=oud$/);
});

test('/ofertas muestra solo los perfumes en oferta', async ({ page }) => {
  await page.goto('/ofertas');
  await expect(page.locator('h1')).toHaveText('Ofertas');
  const [vistos, esperados] = await page.evaluate(() => [
    $$('#app article h3').map(h => h.textContent.trim()).sort(),
    PRODUCTS.filter(p => p.oferta > 0).map(p => p.nombre).sort()
  ]);
  expect(vistos.length).toBeGreaterThan(0);
  expect(vistos).toEqual(esperados);
});

test('/decants muestra la vista de decants con tarjetas que llevan al decant', async ({ page }) => {
  await page.goto('/decants');
  await expect(page.locator('h1')).toHaveText('Decants');
  await expect(page.locator('#app article').first().getByText('Ver el decant')).toBeVisible();
  const hrefs = await page.locator('#app article h3 a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of hrefs) expect(h).toMatch(/^\/perfumes\/[a-z0-9-]+\?formato=decant$/);
});

test('las tarjetas enlazan a /perfumes/<id> y la ficha vieja sigue funcionando', async ({ page }) => {
  await page.goto('/catalogo.html');
  const hrefs = await page.locator('#app article h3 a').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of hrefs) expect(h).toMatch(/^\/perfumes\/[a-z0-9-]+$/);
  await page.locator('#app article h3 a', { hasText: 'Khamrah' }).first().click();
  await expect(page).toHaveURL(/\/perfumes\/khamrah$/);
  await expect(page.locator('h1')).toHaveText('Khamrah');
  await page.goto('/producto.html?id=khamrah');
  await expect(page.locator('h1')).toHaveText('Khamrah');
  await page.goto('/catalogo.html?oferta=1');
  await expect(page.locator('h1')).toHaveText('Ofertas');
  await page.goto('/perfumes/khamrah?formato=decant');
  await expect(page).toHaveTitle(/^Decant de Khamrah/);
});

test('el aviso del corazón en /perfumes/khamrah vuelve a la misma dirección después de entrar', async ({ page }) => {
  const { correo, clave } = await cuentaNueva(page, { sesion: false });
  await page.goto('/perfumes/khamrah');
  await page.locator('#app [data-action=fav]').first().click();
  const entrar = page.getByRole('dialog').getByRole('link', { name: 'Iniciar sesión' });
  await expect(entrar).toHaveAttribute('href', '/login.html?next=perfumes%2Fkhamrah');
  await entrar.click();
  await expect(page).toHaveURL(/\/login\.html\?next=perfumes%2Fkhamrah$/);
  await page.fill('#lg-email', correo); await page.fill('#lg-pass', clave);
  await page.click('#lg-form button[type=submit]');
  await expect(page).toHaveURL(/^http:\/\/localhost:4174\/perfumes\/khamrah$/);
  await expect(page.locator('#toast-region')).toContainText('Khamrah se guardó en tus favoritos');
});

test('el enlace Saltar al contenido en /perfumes/khamrah no cambia de página y pasa el foco a main', async ({ page }) => {
  await page.goto('/perfumes/khamrah');
  await expect(page.locator('h1')).toHaveText('Khamrah');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Saltar al contenido principal');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/^http:\/\/localhost:4174\/perfumes\/khamrah#main$/);
  await expect(page.locator('#main')).toBeFocused();
  await expect(page.locator('h1')).toHaveText('Khamrah');
});

test('el menú marca Ofertas y Decants en la dirección limpia y en la vieja', async ({ page }) => {
  for (const [url, ruta] of [['/ofertas', 'oferta'], ['/catalogo.html?oferta=1', 'oferta'], ['/decants', 'decant'], ['/catalogo.html?decant=1', 'decant']]) {
    await page.goto(url);
    const r = await page.evaluate(destino => {
      const iguales = $$('#dd-menu a, #mega a').filter(a => {
        const u = new URL(a.href);
        return u.pathname === '/' + destino + 's' || (u.pathname === '/catalogo.html' && u.search === '?' + destino + '=1');
      });
      return [iguales.length, iguales.filter(a => a.getAttribute('aria-current') === 'page').length, $$('#dd-menu a[aria-current], #mega a[aria-current]').length];
    }, ruta);
    expect(r[0], url).toBeGreaterThan(0);
    expect(r[1], url).toBe(r[0]);
    expect(r[2], url).toBe(r[0]);
    await expect(page.locator('#btn-perfumes')).toHaveAttribute('aria-current', 'true');
  }
});

test('rutaLimpia y params leen la dirección limpia con los parámetros reales encima', async ({ page }) => {
  await page.goto('/decants?familia=floral&decant=2');
  const r = await page.evaluate(() => [
    rutaLimpia('/perfumes/khamrah'), rutaLimpia('/ofertas'), rutaLimpia('/decants'), rutaLimpia('/catalogo.html'), rutaLimpia('/'),
    PAGE, params.get('familia'), params.get('decant'), aquiMismo()
  ]);
  expect(r).toEqual([
    { pagina: 'producto.html', extra: { id: 'khamrah' } },
    { pagina: 'catalogo.html', extra: { oferta: '1' } },
    { pagina: 'catalogo.html', extra: { decant: '1' } },
    { pagina: 'catalogo.html', extra: {} },
    { pagina: 'index.html', extra: {} },
    'catalogo.html', 'floral', '2', 'decants?familia=floral&decant=2'
  ]);
});

test('safeNext acepta las direcciones limpias y rechaza las de afuera', async ({ page }) => {
  await page.goto('/index.html');
  const buenas = ['perfumes/khamrah', 'perfumes/khamrah?formato=decant', 'ofertas', 'decants', 'decants?familia=floral', 'checkout.html'];
  const malas = ['//evil.com', '//evil.com/perfumes/x', 'https://evil.com', 'https://evil.com/ofertas', 'javascript:alert(1)', 'JavaScript:alert(1)',
    '/perfumes/khamrah', 'perfumes/', 'perfumes//evil.com', 'perfumes/../x', 'perfumes/khamrah/otra', 'ofertas.evil.com', 'ofertas/x', '\\\\evil.com', 'perfumes/a b', ''];
  expect(await page.evaluate(l => l.map(x => safeNext(x)), buenas)).toEqual(buenas);
  expect(await page.evaluate(l => l.map(x => safeNext(x)), malas)).toEqual(malas.map(() => 'perfil.html'));
});
