// Toma una captura de una página con el CSS local, para revisar el diseño
// Uso con node tests/soporte/captura.cjs url ancho archivo [acción]
const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
(async () => {
  const [url, ancho, archivo, accion] = process.argv.slice(2);
  const srv = spawn('python3', ['-m', 'http.server', '4174'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 600));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: +ancho, height: 900 } });
  await page.route('https://cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'text/javascript',
    body: "window.tailwind={};document.head.insertAdjacentHTML('beforeend','<link rel=\"stylesheet\" href=\"/tests/.tw.css\">');" }));
  await page.goto('http://localhost:4174/' + url);
  if (accion) await page.evaluate(accion);
  await page.waitForTimeout(300); await page.waitForLoadState("load");
  await page.screenshot({ path: archivo, fullPage: !accion });
  await b.close(); srv.kill();
})();
