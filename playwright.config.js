// Configuración de las pruebas del prototipo en tres anchos de pantalla
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  globalSetup: './tests/soporte/preparar.cjs',
  webServer: { command: 'node backend/servidor.js --prueba', port: 4174, reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
  use: {
    baseURL: 'http://localhost:4174/',
    launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }
  },
  projects: [
    { name: 'escritorio', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { viewport: { width: 800, height: 1000 } } },
    { name: 'movil', use: { viewport: { width: 375, height: 812 }, hasTouch: true } }
  ]
});
