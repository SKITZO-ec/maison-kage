// Copia el encabezado y el pie de plantillas/ a todas las páginas del sitio
// Uso con node herramientas/maquetar.mjs desde la raíz del proyecto
import fs from 'node:fs';

const enc = fs.readFileSync('plantillas/encabezado.html', 'utf8').trim();
const pie = fs.readFileSync('plantillas/pie.html', 'utf8').trim();
const RE_ENC = /<header class="bg-navy[\s\S]*?<\/header>/;
const RE_PIE = /<footer[\s\S]*?<\/footer>/;

let fallas = 0, cambios = 0;
for (const f of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(f, 'utf8');
  if (!RE_ENC.test(html) || !RE_PIE.test(html)) { console.error(`Falta el encabezado o el pie en ${f}`); fallas++; continue; }
  const nuevo = html.replace(RE_ENC, () => enc).replace(RE_PIE, () => pie);
  if (nuevo !== html) { fs.writeFileSync(f, nuevo); cambios++; }
}
console.log(`${cambios} páginas actualizadas`);
process.exit(fallas ? 1 : 0);
