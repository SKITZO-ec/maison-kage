// El catálogo tiene 70 perfumes y ninguna categoría queda con menos de 10
const { test, expect } = require('../soporte/fixtures');

test('cada categoría tiene al menos 10 perfumes', async ({ page }) => {
  await page.goto('index.html');
  const c = await page.evaluate(() => {
    const n = f => PRODUCTS.filter(f).length, out = { total: PRODUCTS.length, ids: new Set(PRODUCTS.map(p => p.id)).size };
    Object.keys(PUBLICOS).forEach(k => out['publico:' + k] = n(p => p.publico === k));
    Object.keys(ORIGENES).forEach(k => out['origen:' + k] = n(p => p.origen === k));
    Object.keys(FAMILIAS).forEach(k => out['familia:' + k] = n(p => p.familia === k));
    OCASIONES.forEach(k => out['ocasion:' + k] = n(p => p.ocasion.includes(k)));
    CONCENTRACIONES.forEach(k => out['conc:' + k] = n(p => p.conc === k));
    out.oferta = n(p => p.oferta > 0); out.novedad = n(p => p.novedad); out.top = n(p => p.top);
    out.decant = n(p => decants(p).length > 0);
    out.unaPres = n(p => p.pres.length === 1);
    out.malos = PRODUCTS.filter(p => !p.desc || p.notas.length !== 3 || !p.pres.length || !FAMILIAS[p.familia] || !ORIGENES[p.origen]
      || !PUBLICOS[p.publico] || !CONCENTRACIONES.includes(p.conc) || !p.ocasion.length || p.ocasion.some(o => !OCASIONES.includes(o))
      || !/^[a-z0-9-]+$/.test(p.id) || (frascos(p).length && decants(p).some(d => d.precio >= frascos(p)[0].precio))).map(p => p.id);
    return out;
  });
  expect(c.total).toBe(70); expect(c.ids).toBe(70); expect(c.malos).toEqual([]);
  for (const [k, v] of Object.entries(c)) if (k.includes(':') || ['oferta', 'novedad', 'top', 'decant'].includes(k)) expect(v, k).toBeGreaterThanOrEqual(10);
  for (const k of Object.keys(c).filter(k => k.startsWith('familia:'))) expect(c[k], k).toBe(10);
  expect(c.unaPres).toBeGreaterThanOrEqual(5);
});
