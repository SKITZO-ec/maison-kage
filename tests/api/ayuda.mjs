/* =========================================================
   Ayudas de las pruebas de la API
   iniciarApp levanta la app en un puerto libre y cliente
   da peticiones que guardan cookies y mandan el CSRF
   ========================================================= */
import { cargarConfig } from '../../backend/config.js';
import { crearPool } from '../../backend/bd.js';
import { crearApp } from '../../backend/app.js';

export async function iniciarApp(opciones = {}){
  const base = cargarConfig(['--prueba']);
  const config = { ...base, ...opciones, bd: { ...base.bd, ...opciones.bd } };
  const pool = crearPool(config.bd);
  const app = crearApp({ pool, config });
  const servidor = await new Promise((resolver, rechazar) => {
    const s = app.listen(0, () => resolver(s));
    s.once('error', rechazar);
  });
  const url = `http://localhost:${servidor.address().port}`;
  config.urlBase = url;
  return {
    base: url,
    pool,
    async cerrar(){
      servidor.closeAllConnections();
      await new Promise(r => servidor.close(r));
      await pool.end();
    }
  };
}

export function cliente(base){
  const cookies = new Map();

  async function enviar(metodo, ruta, cuerpo){
    const cabeceras = {};
    if (cookies.size) cabeceras.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookies.has('mk_csrf')) cabeceras['X-CSRF'] = cookies.get('mk_csrf');
    if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    const r = await fetch(base + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      redirect: 'manual'
    });
    for (const linea of r.headers.getSetCookie()){
      const [par, ...atributos] = linea.split(';');
      const i = par.indexOf('=');
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      const vencida = atributos.some(a => /^\s*max-age=0\s*$/i.test(a)) || valor === '';
      if (vencida) cookies.delete(nombre); else cookies.set(nombre, valor);
    }
    const texto = await r.text();
    let datos = texto;
    try{ datos = texto ? JSON.parse(texto) : null; }catch{ /* no era JSON */ }
    return { status: r.status, cuerpo: datos };
  }

  return {
    get: ruta => enviar('GET', ruta),
    post: (ruta, cuerpo) => enviar('POST', ruta, cuerpo ?? {}),
    put: (ruta, cuerpo) => enviar('PUT', ruta, cuerpo ?? {}),
    patch: (ruta, cuerpo) => enviar('PATCH', ruta, cuerpo ?? {}),
    del: ruta => enviar('DELETE', ruta)
  };
}
