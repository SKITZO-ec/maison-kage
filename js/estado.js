/* =========================================================
   MAISON KAGE · Estado de la página
   La cuenta, los favoritos, las direcciones y el carrito con
   sesión vienen del servidor en js/sesion.js (la constante SESION),
   así se ven igual en cualquier pestaña. Sin sesión el carrito
   se guarda en sessionStorage como en la Fase 1. Los pedidos
   viven solo en la base
   ========================================================= */
const STORE_KEY = 'mk-sesion';

/* Si js/sesion.js no llegó la página sigue funcionando como si no hubiera sesión */
const SES = (typeof SESION !== 'undefined' && SESION) || {usuario:null, favoritos:[], direcciones:[], carrito:[]};

/* Carrito guardado en esta pestaña sin sesión. Una sesión vieja puede traer cuentas,
   favoritos o pedidos guardados, todo eso se ignora */
function carritoSinSesion(){
  try{
    const raw = JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
    return Array.isArray(raw.cart) ? raw.cart : [];
  }catch(e){ return []; }
}

const state = {
  /* líneas del carrito {id, kind:'frasco'|'decant', ml, qty} */
  cart: SES.usuario ? (Array.isArray(SES.carrito) ? SES.carrito.map(l => ({...l})) : []) : carritoSinSesion()
};
state.user = SES.usuario ? SES.usuario.correo : null; // correo de la cuenta con sesión iniciada
state.favs = [...(SES.favoritos || [])];               // slugs de los perfumes favoritos

/* Sin sesión el carrito queda en sessionStorage. Con sesión lo guarda guardarCarrito() en el servidor */
function save(){
  if(state.user) return;
  try{ sessionStorage.setItem(STORE_KEY, JSON.stringify({cart: state.cart})); }catch(e){}
}
/* Al entrar a la cuenta el carrito sin sesión ya pasó al servidor, así que se borra de la pestaña */
function borrarCarritoSinSesion(){
  try{ sessionStorage.removeItem(STORE_KEY); }catch(e){}
}
