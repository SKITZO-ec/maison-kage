// Prueba de aceptación. La compra completa se hace solo con el teclado,
// sin click, fill ni focus, en los tres anchos de pantalla
const { test, expect, cuentaNueva } = require('../soporte/fixtures');

/* Presiona Tab hasta que el elemento con foco cumpla la condición.
   En cada paso revisa que el foco esté visible en la pantalla */
async function tabHasta(page, cond, desc, max = 140) {
  const visto = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const ok = await page.evaluate(cond).catch(() => false);
    visto.push(await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName + ' ' + (a.id || (a.textContent || '').trim().slice(0, 20)) : '-'; }).catch(() => '?'));
    if (ok) {
      const r = await page.evaluate(() => { const b = document.activeElement.getBoundingClientRect(); return [b.width, b.height, b.top, b.bottom, innerHeight]; });
      expect(r[0] * r[1], `${desc} sin tamaño`).toBeGreaterThan(0);
      expect(r[2] < r[4] && r[3] > 0, `${desc} fuera de la pantalla`).toBe(true);
      return;
    }
  }
  throw new Error(`No se llegó con Tab a ${desc}. Recorrido ${visto.slice(0, 30).join(' > ')}`);
}
const texto = t => new Function(`const a = document.activeElement; return !!a && (a.textContent || '').trim().replace(/\\s+/g, ' ').startsWith(${JSON.stringify(t)})`);
/* Espera a que la página nueva termine de cargar antes de seguir con Tab */
async function llega(page, re) { await expect(page).toHaveURL(re); await page.waitForLoadState('load'); }
const id = i => new Function(`return document.activeElement && document.activeElement.id === ${JSON.stringify(i)}`);

test('compra completa solo con teclado', async ({ page }) => {
  test.setTimeout(90000);
  /* La cuenta se crea antes por la API y queda sin sesión, así el recorrido pasa por el login */
  const { correo, clave } = await cuentaNueva(page, { sesion: false });
  await page.goto('index.html');

  await tabHasta(page, () => !!document.activeElement?.matches('#home-ofertas h3 a') && document.activeElement.textContent.includes('Khamrah'), 'la tarjeta de Khamrah');
  await page.keyboard.press('Enter');
  await llega(page, /producto\.html\?id=khamrah/);

  await tabHasta(page, id('pd-add'), 'Agregar al carrito');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cart-count')).toHaveText('1');

  await tabHasta(page, id('cart-link'), 'el botón del carrito');
  await page.keyboard.press('Enter');
  await llega(page, /carrito\.html/);

  await tabHasta(page, texto('Ir al checkout'), 'Ir al checkout');
  await page.keyboard.press('Enter');
  await llega(page, /login\.html\?next=checkout\.html/);

  await tabHasta(page, id('lg-email'), 'el correo del login');
  await page.keyboard.type(correo);
  await page.keyboard.press('Tab');
  await page.keyboard.type(clave);
  await page.keyboard.press('Enter');
  await llega(page, /\/checkout\.html$/);

  await tabHasta(page, id('co-tel'), 'el celular');
  await page.keyboard.type('0991234567');

  /* La entrega se cambia con las flechas y vuelve a envío a domicilio */
  await tabHasta(page, () => document.activeElement?.name === 'entrega', 'la entrega');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('input[value=retiro]')).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('input[value=envio]')).toBeChecked();

  await tabHasta(page, id('co-ciudad'), 'la ciudad');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#co-ciudad')).toHaveValue('Quito');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Av. Amazonas N24 y Colón');

  await tabHasta(page, id('co-submit'), 'Continuar al pago');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cd-num')).toBeFocused();
  await page.keyboard.type('4111111111111111');
  await page.keyboard.press('Tab'); await page.keyboard.type('Ana Ruiz');
  await page.keyboard.press('Tab'); await page.keyboard.type('08/30');
  await page.keyboard.press('Tab'); await page.keyboard.type('123');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/confirmacion\.html/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
  expect(page.erroresConsola).toEqual([]);
});

test('el menú Perfumes y el aviso del corazón funcionan con teclado', async ({ page }, info) => {
  await page.goto('index.html');
  const boton = info.project.name === 'escritorio' ? 'btn-perfumes' : 'btn-menu';
  await tabHasta(page, id(boton), 'el botón del menú');
  await page.keyboard.press('Enter');
  await expect(page.locator(boton === 'btn-perfumes' ? '#mega' : '#dd-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator(boton === 'btn-perfumes' ? '#mega' : '#dd-menu')).toBeHidden();
  await expect(page.locator('#' + boton)).toBeFocused();

  await tabHasta(page, () => document.activeElement?.dataset?.action === 'fav', 'un corazón');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: /favoritos/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
