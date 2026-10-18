// Todas las páginas comparten el mismo encabezado y pie de la plantilla
const fs = require('fs');
const { test, expect } = require('../soporte/fixtures');

test('las 16 páginas usan la plantilla', async () => {
  const enc = fs.readFileSync('plantillas/encabezado.html', 'utf8').trim();
  const pie = fs.readFileSync('plantillas/pie.html', 'utf8').trim();
  const paginas = fs.readdirSync('.').filter(f => f.endsWith('.html'));
  expect(paginas.length).toBe(16);
  for (const f of paginas) {
    const html = fs.readFileSync(f, 'utf8');
    expect(html, f).toContain(enc);
    expect(html, f).toContain(pie);
  }
});
