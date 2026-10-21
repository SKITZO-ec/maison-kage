/* =========================================================
   MAISON KAGE · Estado de la página
   La cuenta, los favoritos y las direcciones vienen del servidor
   en js/sesion.js (la constante SESION), así se ven igual en
   cualquier pestaña. El carrito sin sesión y los pedidos todavía
   se guardan en sessionStorage, los pedidos pasan a la base después
   ========================================================= */
const STORE_KEY = 'mk-sesion';
/* Lo único que se guarda en el navegador */
const GUARDADO = ['cart', 'orders', 'lastOrder', 'orderSeq'];

/* Si js/sesion.js no llegó la página sigue funcionando como si no hubiera sesión */
const SES = (typeof SESION !== 'undefined' && SESION) || {usuario:null, favoritos:[], direcciones:[]};

const emptyState = () => ({
  cart: [],        // líneas del carrito {id, kind:'frasco'|'decant', ml, qty}
  orders: [],      // pedidos realizados
  lastOrder: null, // último pedido, para la pantalla de confirmación
  orderSeq: 1      // contador para el número de pedido
});

function loadState(){
  const s = emptyState();
  try{
    const raw = JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
    /* Una sesión vieja puede traer cuentas o favoritos guardados, se ignoran */
    GUARDADO.forEach(k => { if(k in raw) s[k] = raw[k]; });
  }catch(e){}
  return s;
}
const state = loadState();
state.user = SES.usuario ? SES.usuario.correo : null; // correo de la cuenta con sesión iniciada
state.favs = [...(SES.favoritos || [])];               // slugs de los perfumes favoritos

function save(){
  const datos = {};
  GUARDADO.forEach(k => datos[k] = state[k]);
  try{ sessionStorage.setItem(STORE_KEY, JSON.stringify(datos)); }catch(e){}
}
