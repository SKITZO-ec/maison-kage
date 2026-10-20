// Fixture común de las pruebas
// El entorno de pruebas no llega al CDN de Tailwind, por eso esa petición
// se responde con un script que carga el CSS generado en tests/.tw.css
const base = require('@playwright/test');

const test = base.test.extend({
  page: async ({ page }, use) => {
    await page.route('https://cdn.tailwindcss.com/**', r => r.fulfill({
      contentType: 'text/javascript',
      body: "window.tailwind={};document.head.insertAdjacentHTML('beforeend','<link rel=\"stylesheet\" href=\"/tests/.tw.css\">');"
    }));
    // El CSS se entrega desde el disco, así el servidor no tiene que publicar la carpeta tests
    await page.route('**/tests/.tw.css', r => r.fulfill({ contentType: 'text/css', path: require('node:path').join(__dirname, '..', '.tw.css') }));
    page.erroresConsola = [];
    page.on('pageerror', e => page.erroresConsola.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) page.erroresConsola.push(m.text());
    });
    await use(page);
  }
});

module.exports = { test, expect: base.expect };
