/* =========================================================
   MAISON KAGE · Estado de la sesión
   Se guarda en sessionStorage, así cada vez que se abre el sitio
   en una pestaña nueva todo empieza vacío, como la primera visita.
   Mientras se navega entre páginas de la misma pestaña los datos
   (carrito, cuenta, pedidos, direcciones) se conservan.
   ========================================================= */
const STORE_KEY = 'mk-sesion';

const emptyState = () => ({
  cart: [],        // líneas del carrito {id, kind:'frasco'|'decant', ml, qty}
  favs: [],        // ids de perfumes favoritos
  user: null,      // correo de la cuenta con sesión iniciada
  accounts: {},    // cuentas creadas en esta sesión, por correo
  orders: [],      // pedidos realizados
  lastOrder: null, // último pedido, para la pantalla de confirmación
  orderSeq: 1      // contador para el número de pedido
});

function loadState(){
  try{
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? Object.assign(emptyState(), JSON.parse(raw)) : emptyState();
  }catch(e){ return emptyState(); }
}
const state = loadState();

function save(){
  try{ sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}
