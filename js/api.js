/* =========================================================
   MAISON KAGE · Llamadas a la API
   api(metodo, ruta, cuerpo) manda el CSRF de doble envío y
   convierte cualquier respuesta con error en un Error con el
   mensaje en español que la página muestra tal cual
   ========================================================= */
const MSG_SIN_CONEXION = 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';

/* El servidor deja la cookie mk_csrf en cualquier página y la API la pide de vuelta en X-CSRF */
function leerCookie(nombre){
  const par = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(nombre + '='));
  if(!par) return '';
  try{ return decodeURIComponent(par.slice(nombre.length + 1)); }catch(e){ return par.slice(nombre.length + 1); }
}

async function api(metodo, ruta, cuerpo){
  const cabeceras = {'X-CSRF': leerCookie('mk_csrf')};
  if(cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  let r, texto;
  try{
    r = await fetch(ruta, {method:metodo, headers:cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), credentials:'same-origin'});
    texto = await r.text();
  }catch(e){ throw new Error(MSG_SIN_CONEXION); }
  let datos = null;
  try{ datos = texto ? JSON.parse(texto) : null; }catch(e){ /* la respuesta no era JSON */ }
  if(!r.ok){
    const err = new Error(datos && typeof datos.error === 'string' ? datos.error : 'Algo salió mal. Intenta de nuevo.');
    /* El código queda a mano para distinguir un error del servidor de uno sin conexión */
    err.estado = r.status;
    throw err;
  }
  return datos;
}
