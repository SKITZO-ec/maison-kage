// Lee la configuración del navegador y la adapta al CLI de Tailwind
// para generar en las pruebas el mismo CSS que da el CDN
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = { tailwind: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../js/tailwind.config.js'), 'utf8'), ctx);

module.exports = {
  ...ctx.tailwind.config,
  content: ['./*.html', './plantillas/*.html', './js/**/*.js']
};
