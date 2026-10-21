/* =========================================================
   MAISON KAGE · Funciones comunes de todas las páginas
   Orden de carga: datos.js, productos.js, sesion.js, api.js, estado.js, comun.js, script de la página
   ========================================================= */

/* ---------- Utilidades ---------- */
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
/* Si la base falló, el servidor entrega const PRODUCTS = null; y esta bandera queda en true.
   Cada script de página la revisa al empezar para no correr sin catálogo */
const CATALOGO_CAIDO = PRODUCTS === null;
const money = n => '$' + n.toFixed(2);
const byId = id => PRODUCTS.find(p => p.id === id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/* ---------- Presentaciones ----------
   Cada perfume tiene una lista de presentaciones, frascos y decants,
   con su contenido en ml, su precio y su stock */
const porMl = (a, b) => a.ml - b.ml;
const frascos = p => p.pres.filter(x => x.tipo==='frasco').sort(porMl);
const decants = p => p.pres.filter(x => x.tipo==='decant').sort(porMl);
const presOf = (p, tipo, ml) => p ? p.pres.find(x => x.tipo===tipo && x.ml===ml) : undefined;
/* La oferta solo baja el precio de los frascos, el de los decants no cambia */
const precioFinal = (p, pres) => pres.tipo==='frasco' && p.oferta ? Math.round(pres.precio * (100 - p.oferta)) / 100 : pres.precio;
/* Precio más bajo con el que se puede llevar el perfume */
const precioDesde = p => { const f = frascos(p); return f.length ? Math.min(...f.map(x => precioFinal(p, x))) : Math.min(...decants(p).map(x => x.precio)); };
const urlProducto = (id, decant=false) => `producto.html?id=${id}${decant ? '&formato=decant' : ''}`;
const params = new URLSearchParams(location.search);
const PAGE = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';

const ICON = {
  heart:'<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6C19 16.5 12 21 12 21z"/></svg>',
  heartLine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-4.5-9.3-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.3 6C19 16.5 12 21 12 21z"/></svg>',
  drop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/></svg>',
  bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15V4h11"/></svg>',
  store:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 10v10h16V10M3 4h18l-1 6H4L3 4zM9 20v-6h6v6"/></svg>',
  out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

/* Recuadro con X que se muestra mientras no exista la foto */
function ph(label, variant='ph', decorative=false){
  const a11y = decorative ? 'aria-hidden="true"' : `role="img" aria-label="${esc(label)}"`;
  return `<div class="${TW[variant]}" ${a11y}><svg class="${TW.phSvg}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="0" x2="100" y2="100" vector-effect="non-scaling-stroke"/><line x1="100" y1="0" x2="0" y2="100" vector-effect="non-scaling-stroke"/></svg></div>`;
}

/* ---------- Fotos de los productos ----------
   Cada perfume tiene su carpeta en source/img/productos/<id>/ con frente, perfil, caja y decant.
   Las fotos comunes de los decants van sueltas en source/img/productos/.
   Si una foto no existe, se queda el recuadro gris con la X. */
const FOTO_DIR = 'source/img/productos/';
const FOTO_EXT = ['webp', 'jpg', 'jpeg', 'png', 'avif'];
const FOTO_COMUN = ['decant-atomizador', 'decant-etiqueta'];
function fotoSrc(p, vista){
  return FOTO_DIR + (FOTO_COMUN.includes(vista) ? vista : p.id + '/' + vista) + '.' + FOTO_EXT[0];
}
/* Prueba la siguiente extensión y, si ninguna existe, quita la foto y deja el recuadro */
function fotoError(img){
  const n = +(img.dataset.ext || 0) + 1;
  if(n >= FOTO_EXT.length){ img.remove(); return; }
  img.dataset.ext = n;
  img.src = img.src.replace(/\.[a-z]+$/, '.' + FOTO_EXT[n]);
}
/* El evento error no sube por el árbol, por eso se escucha en la fase de captura.
   Reemplaza los onerror en línea, que la política de seguridad del servidor bloquea */
document.addEventListener('error', e => {
  const img = e.target;
  if(!(img instanceof HTMLImageElement)) return;
  if(img.hasAttribute('data-foto')) fotoError(img);
  else if(img.hasAttribute('data-quitar')) img.remove();
}, true);
function foto(p, vista, label, variant='ph', decorative=false){
  const img = `<img class="${TW.phImg}" src="${fotoSrc(p, vista)}" alt="" loading="lazy" decoding="async" data-foto>`;
  return ph(label, variant, decorative).replace(/<\/div>$/, img + '</div>');
}

/* ---------- Favoritos ---------- */
const isFav = id => state.favs.includes(id);
/* Pone el estado del favorito en state.favs y en todos los corazones de ese perfume */
function marcarFavorito(id, on){
  const p = byId(id);
  state.favs = on ? [...state.favs.filter(x => x!==id), id] : state.favs.filter(x => x!==id);
  $$(`[data-action="fav"][data-id="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', `${on?'Quitar':'Guardar'} ${p.nombre} ${on?'de':'en'} favoritos`); });
  document.dispatchEvent(new CustomEvent('mk:favs'));
}
function favBtn(p, inline=false){
  const on = isFav(p.id);
  return `<button type="button" class="${inline ? TW.favInline : TW.fav}" data-action="fav" data-id="${p.id}" aria-pressed="${on}" aria-label="${on?'Quitar':'Guardar'} ${esc(p.nombre)} ${on?'de':'en'} favoritos">${ICON.heart}</button>`;
}

/* Tarjeta de producto única, igual en todas las páginas */
/* modo 'decant': la tarjeta muestra primero el precio y los tamaños del decant y lleva a la ficha con Decant elegido */
function card(p, modo=''){
  if(typeof modo !== 'string') modo = '';
  const dec = modo==='decant' && decants(p).length>0;
  const url = urlProducto(p.id, dec);
  const fr = frascos(p), ds = decants(p), f0 = fr[0];
  const agotado = fr.length && fr.every(x => x.stock===0);
  const media = `<a class="${TW.cardMediaLink}" href="${url}" tabindex="-1">
      ${foto(p, dec?'decant':'frente', (dec?'Decant de ':'Frasco de ')+p.nombre+' de '+p.marca)}
      ${!dec && p.oferta && f0 ? `<span class="${TW.cardSeal}" aria-label="Oferta, ${p.oferta} por ciento de descuento">-${p.oferta}%</span>` : ''}
      ${dec ? `<span class="${TW.cardTagGold}">Decant</span>` : agotado ? `<span class="${TW.cardTag}">Frasco agotado</span>` : p.novedad ? `<span class="${TW.cardTagGold}">Novedad</span>` : p.top ? `<span class="${TW.cardTagGold}">Más vendido</span>` : ''}
    </a>`;
  const head = `${favBtn(p)}
    <p class="${TW.cardBrand}">${esc(p.marca)} · ${ORIGENES[p.origen]}</p>
    <h3 class="${TW.cardName}" id="c-${p.id}"><a class="${TW.cardNameLink}" href="${url}">${esc(p.nombre)}</a></h3>
    <p class="${TW.cardMeta}">${PUBLICOS[p.publico]} · ${p.conc}</p>`;
  const body = dec ? `
    <p class="${TW.price}"><small class="${TW.priceFrom}">Decant desde </small>${money(ds[0].precio)}</p>
    <div class="${TW.decSizes}" role="group" aria-label="Agregar un decant al carrito">${ds.map(x=>`<button type="button" class="${TW.decSizeBtn}" data-action="add-decant" data-id="${p.id}" data-ml="${x.ml}" aria-label="Agregar decant de ${x.ml} ml de ${esc(p.nombre)} al carrito, ${money(x.precio)}">${x.ml} ml</button>`).join('')}</div>
    ${f0 ? `<p class="${TW.cardDec}">Frasco ${f0.ml} ml ${agotado ? 'agotado' : 'desde '+money(precioFinal(p,f0))}</p>` : ''}
    <a class="${TW.cardBtn}" href="${url}" aria-label="Ver el decant de ${esc(p.nombre)}">Ver el decant</a>` : `
    <p class="${TW.price} flex flex-wrap items-baseline">${money(precioDesde(p))} ${p.oferta && f0?`<s class="${TW.priceOld}"><span class="sr-only">Precio anterior </span>${money(f0.precio)}</s> `:''}<small class="${TW.priceUnit}">${f0 ? f0.ml+' ml' : 'decant'}</small></p>
    ${ds.length && f0 ? `<p class="${TW.cardDec}">${ICON.drop} Decant desde ${money(ds[0].precio)}</p>` : ''}
    <a class="${TW.cardBtn}" href="${url}" aria-label="Ver detalle de ${esc(p.nombre)}">Ver detalle</a>`;
  return `<article class="${TW.card}" aria-labelledby="c-${p.id}">
    ${media}
    ${head}${body}
  </article>`;
}

/* ---------- Carrito ---------- */
const lineKey = l => `${l.id}|${l.kind}|${l.ml}`;
const cartCount = () => state.cart.reduce((a,l)=>a+l.qty,0);
const unitPrice = l => { const p = byId(l.id); return precioFinal(p, presOf(p, l.kind, l.ml)); };
/* Cuántas unidades de una presentación se pueden tener en el carrito */
const maxDe = (p, kind, ml) => { const x = presOf(p, kind, ml); return !x ? 0 : kind==='decant' ? Math.min(DEC_MAX, x.stock) : x.stock; };
/* Revisa el carrito guardado. Quita las líneas de perfumes o presentaciones que ya no existen,
   convierte las cantidades a números enteros y las baja al máximo disponible */
function limpiarCarrito(){
  const antes = JSON.stringify(state.cart);
  if(!Array.isArray(state.cart)) state.cart = [];
  state.cart = state.cart.filter(l => l && presOf(byId(l.id), l.kind, l.ml)).map(l => {
    const max = maxDe(byId(l.id), l.kind, l.ml), q = Math.floor(Number(l.qty));
    return {...l, qty: Number.isFinite(q) ? Math.min(q, max) : 0};
  }).filter(l => l.qty > 0);
  /* El carrito de la base se guarda saneado pero se lee tal cual, así que si el stock bajó
     desde entonces la versión corregida se manda una vez para que el servidor quede igual */
  if(JSON.stringify(state.cart) !== antes) guardarCarrito();
}
/* Guarda el carrito después de cada cambio. Sin sesión va a sessionStorage como en la Fase 1.
   Con sesión la página ya cambió state.cart y aquí se manda completo al servidor.
   Si hay un envío en camino no se manda otro encima, al terminar se manda una vez más
   con lo último, así el servidor siempre termina con el carrito que se ve.
   Si el servidor devuelve otra cosa, por ejemplo menos unidades por el stock, esa respuesta
   pasa a state.cart y la página se vuelve a dibujar */
let carritoEnCamino = null, carritoOtraVez = false;
const mismoCarrito = (a, b) => JSON.stringify(a.map(l => [lineKey(l), l.qty])) === JSON.stringify(b.map(l => [lineKey(l), l.qty]));
function guardarCarrito(){
  if(!currentUser()){ save(); return Promise.resolve(); }
  if(carritoEnCamino){ carritoOtraVez = true; return carritoEnCamino; }
  carritoEnCamino = (async () => {
    try{
      do{
        carritoOtraVez = false;
        let lineas;
        try{ lineas = await api('PUT', '/api/carrito', {lineas: state.cart}, {keepalive:true}); }
        catch(err){ if(!carritoOtraVez) toast(err.message, {type:'error'}); continue; }
        if(!carritoOtraVez && Array.isArray(lineas) && !mismoCarrito(lineas, state.cart)){
          state.cart = lineas;
          updateCartBadge();
          document.dispatchEvent(new CustomEvent('mk:carrito'));
        }
      }while(carritoOtraVez);
    }finally{ carritoEnCamino = null; }
  })();
  return carritoEnCamino;
}
/* entrega: 'envio' (a domicilio) o 'retiro' (en el local, sin costo) */
function totals(entrega='envio'){
  const sub = state.cart.reduce((a,l)=>a+unitPrice(l)*l.qty,0);
  const ship = entrega==='retiro' || sub===0 || sub>=FREE_SHIP ? 0 : SHIP;
  return {sub, ship, total: sub+ship, entrega};
}
/* Unidades de una presentación que ya están en el carrito */
const enCarrito = (id, kind, ml) => state.cart.filter(l => l.id===id && l.kind===kind && l.ml===ml).reduce((a,l)=>a+l.qty,0);

function addToCart(id, kind, ml, qty, silent=false){
  const p = byId(id), pres = presOf(p, kind, ml);
  if(!pres) return false;
  const line = state.cart.find(l=>l.id===id && l.kind===kind && l.ml===ml);
  const used = line ? line.qty : 0, max = maxDe(p, kind, ml);
  if(used + qty > max){
    if(kind==='frasco') toast(pres.stock===0 ? `${p.nombre} de ${ml} ml está agotado.${decants(p).length?' Puedes llevarlo como decant.':''}` : `Solo hay ${pres.stock} unidades de ${p.nombre} de ${ml} ml y ya tienes ${used} en tu carrito.`, {type:'error'});
    else toast(max < DEC_MAX ? `Solo quedan ${max} decants de ${ml} ml de ${p.nombre}.` : `Puedes llevar hasta ${DEC_MAX} decants de ${ml} ml del mismo perfume.`, {type:'error'});
    return false;
  }
  if(line) line.qty += qty; else state.cart.push({id, kind, ml, qty});
  guardarCarrito(); updateCartBadge();
  document.dispatchEvent(new CustomEvent('mk:carrito'));
  if(!silent) toast(`Agregado al carrito: ${p.nombre}, ${kind==='decant'?'decant ':'frasco '}${ml} ml`, {link:['Ver carrito','carrito.html']});
  return true;
}
/* Al iniciar sesión o crear la cuenta, lo que estaba en el carrito sin sesión se suma al de la cuenta.
   Se leen las líneas de sessionStorage en ese momento y no state.cart, porque con una sesión ya abierta
   state.cart es el carrito de la cuenta y sumarlo otra vez lo duplicaría o lo pasaría a otra cuenta.
   Si sale bien se borra de la pestaña. Si falla queda en la pestaña y se devuelve el mensaje para avisarlo */
async function pasarCarritoALaCuenta(){
  const lineas = carritoSinSesion();
  if(!lineas.length) return null;
  try{ await api('POST', '/api/carrito/fusionar', {lineas}); }
  catch(err){ return err.message; }
  borrarCarritoSinSesion();
  return null;
}
function updateCartBadge(){
  const n = cartCount();
  $('#cart-count').textContent = n;
  $('#cart-count').hidden = n===0;
  $('#cart-link').setAttribute('aria-label', `Carrito, ${n} ${n===1?'producto':'productos'}`);
}
function emptyCartHTML(h='h1'){
  return `<div class="${TW.empty}">
    <div class="${TW.emptyIcon}">${ICON.bag}</div>
    <${h} class="${TW.emptyTitle}">Tu carrito está vacío</${h}>
    <p class="${TW.emptyP}">Todavía no agregas perfumes. Explora los perfumes o empieza con un decant de 2 ml para conocer una fragancia sin gastar en el frasco.</p>
    <div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Explorar los perfumes</a><a class="${TW.btnOutline}" href="catalogo.html?decant=1">Ver decants</a></div>
  </div>`;
}
function summaryRows(t){
  return `<div class="${TW.srow}"><span>Subtotal</span><span>${money(t.sub)}</span></div>
    <div class="${TW.srow}"><span>${t.entrega==='retiro'?'Retiro en el local':'Envío a domicilio'}</span><span>${t.ship===0?'Gratis':money(t.ship)}</span></div>
    ${t.ship>0?`<p class="${TW.shipHint}">Te faltan ${money(FREE_SHIP-t.sub)} para el envío gratis, o retira gratis en nuestro local en Quito.</p>`:''}
    ${t.entrega==='envio' && t.sub>=FREE_SHIP?`<p class="${TW.shipHint}">Tu envío es gratis porque tu compra llega a ${money(FREE_SHIP)}. Recuerda que el envío gratis aplica solo en compras desde ${money(FREE_SHIP)}.</p>`:''}
    <div class="${TW.srowTotal}"><span>Total</span><span>${money(t.total)}</span></div>`;
}

/* ---------- Entrega del pedido (confirmación y Mis pedidos) ---------- */
const fmtGuia = g => g.replace(/(\d{4})(?=\d)/g, '$1 ');
function entregaHTML(o){
  if(o.entrega==='retiro') return `<div class="${TW.deliveryBox}">
      <p class="${TW.deliveryTitle}">${ICON.store} Retiro en el local</p>
      <p>${esc(LOCAL.dir)}</p><p>${LOCAL.horario}</p>
      <p class="${TW.small}">${o.estado==='Pago en verificación' ? 'Te avisaremos cuando confirmemos el pago y tu pedido esté listo.' : `${LOCAL.plazo}. Tienes ${LOCAL.dias} días para retirarlo presentando tu número de pedido <strong>${o.num}</strong> y tu cédula.`}</p>
    </div>`;
  if(o.estado==='Pago en verificación' || !o.guia) return `<div class="${TW.deliveryBox}">
      <p class="${TW.deliveryTitle}">${ICON.truck} Envío a domicilio con Servientrega</p>
      <p>${esc(o.envio.dir)}, ${esc(o.envio.ciudad)}</p>
      <p class="${TW.small}">Tu número de guía aparecerá aquí cuando confirmemos el pago.</p>
    </div>`;
  return `<div class="${TW.deliveryBox}">
      <p class="${TW.deliveryTitle}">${ICON.truck} Envío a domicilio con Servientrega</p>
      <p>${esc(o.envio.dir)}, ${esc(o.envio.ciudad)}</p>
      <p class="${TW.guiaLabel}" id="g-${o.num}">Número de guía Servientrega</p>
      <div class="${TW.guiaRow}">
        <span class="${TW.guiaNum}" aria-labelledby="g-${o.num}">${fmtGuia(o.guia)}</span>
        <button type="button" class="${TW.btnOutline}" data-action="copy-guia" data-guia="${o.guia}" aria-label="Copiar número de guía ${fmtGuia(o.guia)}">${ICON.copy} Copiar</button>
        <a class="${TW.btnNavy}" href="${RASTREO_URL}" target="_blank" rel="noopener">Rastrear en Servientrega ${ICON.ext}<span class="sr-only"> (se abre en otra pestaña)</span></a>
      </div>
      <p class="${TW.small} font-semibold mt-3">Para saber dónde está tu pedido</p>
      <ol class="list-decimal ml-5 grid gap-1 text-[14px]"><li>Copia tu número de guía con el botón Copiar.</li><li>Abre la página de rastreo de Servientrega.</li><li>Pega el número y consulta dónde está tu pedido.</li></ol>
      <p class="${TW.small} mt-2">El rastreo se activa cuando el pedido sale de nuestro local, normalmente el mismo día.</p>
    </div>`;
}

/* ---------- Avisos (toast) ---------- */
function toast(msg, {type='ok', link, action}={}){
  const r = $('#toast-region');
  r.setAttribute('aria-live', type==='error' ? 'assertive' : 'polite');
  const el = document.createElement('div');
  el.className = type==='error' ? TW.toastError : TW.toast;
  el.innerHTML = `<p class="${TW.toastText}">${esc(msg)}</p>${link?`<a class="${TW.toastLink}" href="${link[1]}">${link[0]}</a>`:''}${action?`<button type="button" class="${TW.toastAction}" data-toast-action>${esc(action[0])}</button>`:''}<button type="button" class="${TW.toastX}" data-toast-close aria-label="Cerrar aviso">×</button>`;
  r.innerHTML = ''; r.appendChild(el);
  el.querySelector('[data-toast-close]').onclick = () => el.remove();
  /* Con una acción, por ejemplo Deshacer, el aviso dura más para dar tiempo de usarla */
  if(action) el.querySelector('[data-toast-action]').onclick = () => { el.remove(); action[1](); };
  clearTimeout(toast.t); toast.t = setTimeout(()=>el.remove(), action ? 8000 : 5500);
}
/* Aviso que se muestra en la siguiente página, después de redirigir */
function flash(msg, opts={}){ try{ sessionStorage.setItem('mk-aviso', JSON.stringify({msg, opts})); }catch(e){} }
function showFlash(){
  try{
    const f = JSON.parse(sessionStorage.getItem('mk-aviso'));
    sessionStorage.removeItem('mk-aviso');
    if(f) toast(f.msg, f.opts);
  }catch(e){}
}

/* ---------- Diálogos ---------- */
let modalCtx = null;
function openModal(title, bodyHTML, actions, {alert=false, onCancel}={}){
  const root = $('#modal-root'), m = $('#modal');
  modalCtx = {last: document.activeElement, onCancel};
  m.setAttribute('role', alert ? 'alertdialog' : 'dialog');
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHTML;
  const desc = $('#modal-body [id]');
  desc ? m.setAttribute('aria-describedby', desc.id) : m.removeAttribute('aria-describedby');
  const box = $('#modal-actions'); box.innerHTML = '';
  actions.forEach(a => {
    const b = document.createElement('button');
    b.className = a.cls; b.textContent = a.label; b.type = 'button';
    if(a.id) b.id = a.id;
    b.onclick = a.fn; box.appendChild(b);
  });
  root.hidden = false;
  document.body.classList.add('overflow-hidden');
  box.querySelector('button')?.focus();
}
function closeModal(){
  $('#modal-root').hidden = true;
  document.body.classList.remove('overflow-hidden');
  const last = modalCtx?.last; modalCtx = null;
  if(last && document.contains(last)) last.focus();
}
/* Mientras se crea el pedido el diálogo no se puede cerrar con Escape ni con clic afuera */
function cancelModal(){ if(modalCtx?.bloqueado) return; const fn = modalCtx?.onCancel; closeModal(); fn && fn(); }
$('#modal-root').addEventListener('click', e => { if(e.target.id==='modal-root') cancelModal(); });
$('#modal').addEventListener('keydown', e => {
  if(e.key==='Escape'){ e.preventDefault(); cancelModal(); return; }
  if(e.key==='Tab'){
    const f = $$('#modal button:not([disabled]), #modal a[href], #modal input').filter(x => x.offsetParent);
    if(!f.length) return;
    const first=f[0], last=f[f.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
});
function confirmDialog(title, msg, okLabel){
  return new Promise(res => openModal(title, `<p id="modal-desc">${esc(msg)}</p>`, [
    {label:'Cancelar', cls:TW.btnOutline, fn:()=>{closeModal(); res(false);}},
    {label:okLabel, cls:TW.btnGold, fn:()=>{closeModal(); res(true);}}
  ], {alert:true, onCancel:()=>res(false)}));
}

/* ---------- Menús de la barra superior ---------- */
const menus = $$('[data-menu]');
function setMenu(btn, open){ btn.setAttribute('aria-expanded', open); document.getElementById(btn.getAttribute('aria-controls')).hidden = !open; }
function closeAllMenus(except){ menus.forEach(b => { if(b!==except) setMenu(b,false); }); }
menus.forEach(b => {
  const wrap = b.parentElement;
  b.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = b.getAttribute('aria-expanded')==='true';
    if(b.hasAttribute('data-hover') && isOpen && e.detail>0) return; // clic de mouse con el menú ya abierto por hover
    closeAllMenus(b); setMenu(b, !isOpen);
  });
  wrap.addEventListener('focusout', e => { if(!wrap.contains(e.relatedTarget)) setMenu(b,false); });
  if(b.hasAttribute('data-hover')){
    let t;
    wrap.addEventListener('mouseenter', () => { if(!matchMedia('(hover:hover)').matches) return; clearTimeout(t); closeAllMenus(b); setMenu(b,true); });
    wrap.addEventListener('mouseleave', () => { t = setTimeout(()=>setMenu(b,false), 180); });
  }
});
document.addEventListener('click', e => { if(!e.target.closest('[data-menu-wrap]')) closeAllMenus(); });
document.addEventListener('keydown', e => {
  if(e.key!=='Escape' || !$('#modal-root').hidden) return;
  const open = menus.find(b => b.getAttribute('aria-expanded')==='true');
  if(open){ setMenu(open,false); open.focus(); }
});

/* ---------- Cuenta y sesión ---------- */
/* La cuenta viene de SESION. email, tel y addresses son otros nombres de correo,
   telefono y SESION.direcciones, así checkout y perfil siguen leyendo los mismos campos */
const USUARIO = (() => {
  if(!SES.usuario) return null;
  const u = Object.assign({}, SES.usuario);
  if(!Array.isArray(SES.direcciones)) SES.direcciones = [];
  Object.defineProperties(u, {
    email: {get(){ return this.correo; }, set(v){ this.correo = v; }, enumerable:true},
    tel: {get(){ return this.telefono || ''; }, set(v){ this.telefono = v || null; }, enumerable:true},
    addresses: {get(){ return SES.direcciones; }, set(v){ SES.direcciones = v; }, enumerable:true}
  });
  return u;
})();
const currentUser = () => USUARIO;

function renderAccountMenu(){
  const u = currentUser(), dd = $('#dd-account');
  const it = TW.ddItem;
  dd.innerHTML = u ? `
    <p class="${TW.ddHead}">Hola, ${esc(u.nombre)}</p>
    <a class="${it}" href="perfil.html">${ICON.user} Mi perfil</a>
    <a class="${it}" href="pedidos.html">${ICON.box} Mis pedidos</a>
    <a class="${it}" href="favoritos.html">${ICON.heartLine} Favoritos</a>
    <a class="${it}" href="direcciones.html">${ICON.pin} Direcciones de envío</a>
    <hr class="${TW.ddHr}">
    <a class="${it}" href="ayuda.html">${ICON.help} Ayuda y soporte</a>
    <button class="${it}" type="button" data-action="logout">${ICON.out} Cerrar sesión</button>` : `
    <p class="${TW.ddHead}">Bienvenido a Maison Kage</p>
    <a class="${it}" href="login.html">${ICON.user} Iniciar sesión</a>
    <a class="${it}" href="registro.html">${ICON.check} Crear cuenta</a>
    <hr class="${TW.ddHr}">
    <a class="${it}" href="ayuda.html">${ICON.help} Ayuda y soporte</a>`;
  $('#btn-account').setAttribute('aria-label', u ? `Mi cuenta, sesión de ${u.nombre}` : 'Mi cuenta, sin sesión iniciada');
}
/* Nombre y correo en la barra lateral de Mi cuenta */
function renderAccUser(){
  const box = $('#acc-user'), u = currentUser();
  if(box && u) box.innerHTML = `<strong class="${TW.accUserName}">${esc(u.nombre)} ${esc(u.apellido)}</strong><span class="${TW.accUserMail}">${esc(u.email)}</span>`;
}
/* Destino seguro después de iniciar sesión. Solo acepta páginas del sitio, con o sin parámetros */
function safeNext(raw, fallback='perfil.html'){
  return /^[a-z0-9-]+\.html(\?[a-z0-9=&%._-]*)?$/i.test(raw || '') ? raw : fallback;
}
const aquiMismo = () => PAGE + location.search;

/* ---------- Aviso del corazón sin sesión ----------
   Pequeño, junto al corazón y sin bloquear la pantalla.
   Si la persona entra a su cuenta desde el aviso, el favorito se guarda al volver */
const FAV_PEND = 'mk-fav-pendiente';
let avisoFav = null;
function abrirAvisoFavorito(btn){
  cerrarAvisoFavorito(false);
  const next = encodeURIComponent(aquiMismo());
  const el = document.createElement('div');
  el.className = TW.favPop; el.id = 'aviso-fav';
  el.setAttribute('role','dialog'); el.setAttribute('aria-modal','false'); el.setAttribute('aria-labelledby','aviso-fav-t');
  el.innerHTML = `<p class="${TW.favPopText}" id="aviso-fav-t">Para guardar tus favoritos crea una cuenta. Si ya tienes una, inicia sesión.</p>
    <div class="${TW.favPopBtns}"><a class="${TW.btnGold}" href="registro.html?next=${next}" data-fav-ir>Crear cuenta</a><a class="${TW.btnOutline}" href="login.html?next=${next}" data-fav-ir>Iniciar sesión</a></div>
    <button type="button" class="${TW.favPopX}" data-fav-cerrar aria-label="Cerrar aviso">×</button>`;
  document.body.appendChild(el);
  const r = btn.getBoundingClientRect(), w = el.offsetWidth;
  el.style.left = Math.max(16, Math.min(r.right - w, innerWidth - 16 - w)) + scrollX + 'px';
  el.style.top = r.bottom + 8 + scrollY + 'px';
  avisoFav = {el, btn, id: btn.dataset.id};
  el.querySelectorAll('[data-fav-ir]').forEach(a => a.addEventListener('click', () => { try{ sessionStorage.setItem(FAV_PEND, avisoFav.id); }catch(e){} }));
  el.querySelector('[data-fav-cerrar]').onclick = () => cerrarAvisoFavorito();
  /* El aviso está al final de la página, por eso al salir de él con Tab o Shift+Tab
     se cierra y el foco vuelve al corazón, así el orden de lectura no salta */
  el.addEventListener('keydown', e => {
    if(e.key==='Escape'){ e.stopPropagation(); cerrarAvisoFavorito(); return; }
    if(e.key!=='Tab') return;
    const f = [...el.querySelectorAll('a, button')];
    if((e.shiftKey && document.activeElement===f[0]) || (!e.shiftKey && document.activeElement===f[f.length-1])){ e.preventDefault(); cerrarAvisoFavorito(); }
  });
  el.addEventListener('focusout', e => { if(avisoFav && !el.contains(e.relatedTarget)) cerrarAvisoFavorito(false); });
  el.querySelector('a').focus();
}
function cerrarAvisoFavorito(devolverFoco=true){
  if(!avisoFav) return;
  const {el, btn} = avisoFav; avisoFav = null; el.remove();
  if(devolverFoco && document.contains(btn)) btn.focus();
}
document.addEventListener('click', e => {
  if(avisoFav && !avisoFav.el.contains(e.target) && !avisoFav.btn.contains(e.target)) cerrarAvisoFavorito(false);
});
/* Si había un favorito esperando, se guarda apenas hay sesión */
function aplicarFavoritoPendiente(){
  let id = null;
  try{ id = sessionStorage.getItem(FAV_PEND); sessionStorage.removeItem(FAV_PEND); }catch(e){}
  const p = id && byId(id);
  if(!p || !currentUser() || isFav(id)) return;
  api('PUT', '/api/favoritos/' + encodeURIComponent(id)).then(() => {
    marcarFavorito(id, true);
    toast(`${p.nombre} se guardó en tus favoritos.`, {link:['Ver favoritos','favoritos.html']});
  }, err => toast(err.message, {type:'error'}));
}

/* Las páginas de Mi cuenta piden sesión iniciada */
function requireLogin(){
  if(currentUser()) return true;
  location.replace('login.html?next=' + encodeURIComponent(PAGE));
  return false;
}

/* ---------- Formularios: solo se revisa que los campos estén llenos ---------- */
function field({id, label, type='text', value='', help='', auto='', req=true, attrs='', tight=false}){
  /* Todo celular acepta solo 10 dígitos */
  if(type==='tel') attrs = `inputmode="numeric" maxlength="10" data-digits="10" ${attrs}`;
  const desc = [help ? id+'-help' : '', 'err-'+id].filter(Boolean).join(' ');
  return `<div class="${tight ? TW.fieldTight : TW.field}">
    <label class="${TW.label}" for="${id}">${label}${req?` <span class="${TW.req}" aria-hidden="true">*</span>`:` <span class="${TW.optTag}">(opcional)</span>`}</label>
    ${help?`<p class="${TW.help}" id="${id}-help">${help}</p>`:''}
    <input class="${TW.input}" id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${auto?`autocomplete="${auto}"`:''} ${req?'aria-required="true"':''} aria-describedby="${desc}" ${attrs}>
    <p class="${TW.errorMsg}" id="err-${id}" hidden></p></div>`;
}
function selectField(id, label, value){
  return `<div class="${TW.field}"><label class="${TW.label}" for="${id}">${label} <span class="${TW.req}" aria-hidden="true">*</span></label>
    <select class="${TW.select}" id="${id}" name="${id}" aria-required="true" aria-describedby="err-${id}"><option value="">Elige una ciudad</option>${CIUDADES.map(c=>`<option ${c===value?'selected':''}>${c}</option>`).join('')}</select>
    <p class="${TW.errorMsg}" id="err-${id}" hidden></p></div>`;
}
const fieldName = (form, el) => el.dataset.name || (form.querySelector(`label[for="${el.id}"]`)?.textContent || el.id).replace(/\*|\(opcional\)/g,'').trim();
/* Reglas de formato. Cada campo puede pedir una regla con data-rule
   o se revisa por su tipo (correo y celular). Devuelve el mensaje de error o '' si está bien */
const RULES = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Escribe un correo válido, por ejemplo nombre@correo.com.',
  tel: v => /^09\d{8}$/.test(v.replace(/\s/g,'')) ? '' : 'Escribe un celular de 10 dígitos que empiece con 09.',
  pass: v => v.length >= 8 ? '' : 'La contraseña debe tener al menos 8 caracteres.',
  card: v => /^\d{14,16}$/.test(v.replace(/\s/g,'')) ? '' : 'El número de tarjeta debe tener entre 14 y 16 dígitos.',
  cvv: v => /^\d{3}$/.test(v) ? '' : 'El CVV son los 3 dígitos del reverso de la tarjeta.',
  exp: v => {
    const m = v.match(/^(\d{2})\/(\d{2})$/);
    if(!m || +m[1] < 1 || +m[1] > 12) return 'Escribe el vencimiento como MM/AA, por ejemplo 08/28.';
    const now = new Date(), y = 2000 + +m[2];
    return (y > now.getFullYear() || (y === now.getFullYear() && +m[1] >= now.getMonth() + 1)) ? '' : 'Esta tarjeta ya venció. Usa otra tarjeta.';
  }
};
function ruleError(el){
  if(el.type==='checkbox') return el.checked ? '' : (el.dataset.msg || `Completa el campo ${fieldName(el.form || document, el)}.`);
  const v = el.value.trim();
  if(!v) return el.getAttribute('aria-required')==='true' ? (el.dataset.msg || `Completa el campo ${fieldName(el.form || document, el)}.`) : '';
  const rule = el.dataset.rule || (el.type==='email' ? 'email' : el.type==='tel' ? 'tel' : '');
  if(rule && RULES[rule]){ const m = RULES[rule](v); if(m) return m; }
  if(el.dataset.match){
    const other = document.getElementById(el.dataset.match);
    if(other && other.value !== el.value) return 'Las contraseñas no coinciden. Escríbela otra vez.';
  }
  return '';
}
function checkFilled(form, summaryId){
  const errs = [];
  $$('input, select, textarea', form).filter(el => el.getAttribute('aria-required')==='true' || el.value.trim()).forEach(el => {
    const err = form.querySelector('#err-'+el.id);
    if(!err && el.getAttribute('aria-required')!=='true') return;
    const msg = ruleError(el);
    if(msg){
      errs.push([el.id, msg]); el.setAttribute('aria-invalid','true');
      if(err){ err.textContent = msg; err.hidden = false; }
    } else {
      el.removeAttribute('aria-invalid');
      if(err){ err.textContent = ''; err.hidden = true; }
    }
  });
  const box = form.querySelector('#'+summaryId);
  if(box){
    if(errs.length){
      box.innerHTML = `<h2 class="${TW.errSummaryTitle}">${errs.length===1?'Hay un campo por corregir':'Hay '+errs.length+' campos por corregir'}</h2><ul>${errs.map(([id,m])=>`<li class="${TW.errSummaryItem}"><button class="${TW.errSummaryBtn}" type="button" data-action="focus-field" data-target="${id}">${esc(m)}</button></li>`).join('')}</ul>`;
      box.hidden = false; box.focus();
    } else box.hidden = true;
  }
  return !errs.length;
}
/* ---------- Límites de los campos ----------
   data-digits="N" deja solo N dígitos y data-card agrupa la tarjeta de 4 en 4 sin pasar de 16.
   Se aplica al escribir y al pegar, antes que cualquier otra revisión del campo */
const soloDigitos = (v, max) => String(v ?? '').replace(/\D/g,'').slice(0, max);
const formatCard = v => soloDigitos(v, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const limitar = (el, v) => el.dataset.card !== undefined ? formatCard(v) : soloDigitos(v, +el.dataset.digits);
document.addEventListener('input', e => {
  const el = e.target;
  if(!el.matches?.('[data-digits], [data-card]')) return;
  const nuevo = limitar(el, el.value);
  if(nuevo !== el.value) el.value = nuevo;
}, true);
document.addEventListener('paste', e => {
  const el = e.target;
  if(!el.matches?.('[data-digits], [data-card]')) return;
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData)?.getData('text') || '';
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? el.value.length;
  el.value = limitar(el, el.value.slice(0,a) + txt + el.value.slice(b));
  el.dispatchEvent(new Event('input', {bubbles:true}));
}, true);

/* Mientras una petición espera, el botón queda con aria-disabled y otro texto.
   Un segundo clic se ignora y al terminar el botón vuelve como estaba */
async function conBoton(boton, textoEspera, tarea){
  if(boton.getAttribute('aria-disabled')==='true') return;
  const texto = boton.textContent;
  boton.setAttribute('aria-disabled','true'); boton.textContent = textoEspera;
  try{ return await tarea(); }
  finally{ boton.removeAttribute('aria-disabled'); boton.textContent = texto; }
}

/* Marca un campo con su mensaje de error y le pasa el foco */
function marcarError(id, msg){
  const el = document.getElementById(id), err = document.getElementById('err-'+id);
  el.setAttribute('aria-invalid','true');
  if(err){ err.textContent = msg; err.hidden = false; }
  el.focus();
}

/* Al corregir un campo marcado con error, el error se quita apenas el dato es válido */
['input','change'].forEach(ev => document.addEventListener(ev, e => {
  const el = e.target;
  if(el.getAttribute?.('aria-invalid')!=='true') return;
  if(!ruleError(el)){
    el.removeAttribute('aria-invalid');
    const err = document.getElementById('err-'+el.id); if(err) err.hidden = true;
  }
}));

/* ---------- Navegación activa ---------- */
function markNav(){
  const here = PAGE + location.search;
  $$('#dd-menu a, #mega a, #dd-account a').forEach(a => a.getAttribute('href')===here ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));
  /* Perfumes queda marcado en cualquier listado de perfumes */
  if(PAGE==='catalogo.html') $('#btn-perfumes').setAttribute('aria-current','true');
  /* En el menú compacto se abre el grupo de la categoría actual */
  $$('#dd-menu details').forEach(d => { if(d.querySelector('[aria-current]')) d.open = true; });
  if(PAGE==='carrito.html') $('#cart-link').setAttribute('aria-current','page');
}

/* ---------- Acciones comunes (delegación de eventos) ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-action]');
  if(!t) return;
  const a = t.dataset.action;
  if(a==='copy-guia'){
    const g = t.dataset.guia;
    try{ await navigator.clipboard.writeText(g); }catch(err){ const i = document.createElement('textarea'); i.value = g; document.body.appendChild(i); i.select(); try{ document.execCommand('copy'); }catch(e2){} i.remove(); }
    toast(`Número de guía ${fmtGuia(g)} copiado.`);
    return;
  }
  if(a==='add-decant'){ if(t.getAttribute('aria-disabled')==='true') return; addToCart(t.dataset.id, 'decant', +t.dataset.ml, 1); return; }
  if(a==='back'){ history.length>1 ? history.back() : (location.href='index.html'); return; }
  if(a==='focus-field'){ document.getElementById(t.dataset.target)?.focus(); return; }
  if(a==='fav'){
    if(!currentUser()){ abrirAvisoFavorito(t); return; }
    const id = t.dataset.id, p = byId(id), on = !isFav(id);
    /* El corazón cambia enseguida y si el servidor no lo guarda vuelve como estaba */
    marcarFavorito(id, on);
    toast(on ? `${p.nombre} se guardó en tus favoritos.` : `${p.nombre} se quitó de tus favoritos.`, on ? {link:['Ver favoritos','favoritos.html']} : {});
    try{ await api(on ? 'PUT' : 'DELETE', '/api/favoritos/' + encodeURIComponent(id)); }
    catch(err){ marcarFavorito(id, !on); toast(err.message, {type:'error'}); }
    return;
  }
  if(a==='toggle-pass'){
    const inp = document.getElementById(t.dataset.target), show = inp.type==='password';
    inp.type = show ? 'text' : 'password';
    t.textContent = show ? 'Ocultar' : 'Mostrar';
    t.setAttribute('aria-pressed', show); t.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    return;
  }
  if(a==='logout'){
    closeAllMenus();
    if(await confirmDialog('¿Cerrar sesión?', 'Tu carrito queda guardado en tu cuenta. Para ver tus pedidos tendrás que volver a ingresar.', 'Cerrar sesión')){
      try{ await api('POST', '/api/logout'); }
      catch(err){ toast(err.message, {type:'error'}); return; }
      flash('Cerraste sesión correctamente.');
      location.href = 'index.html';
    }
  }
});

/* Buscador de la barra superior con sugerencias de nombres y marcas */
if(!CATALOGO_CAIDO) $('#sugerencias').innerHTML = [...new Set(PRODUCTS.flatMap(p => [p.nombre, p.marca]))].sort((a,b)=>a.localeCompare(b,'es')).map(v => `<option value="${esc(v)}"></option>`).join('');
$('#search-form').addEventListener('submit', e => {
  e.preventDefault();
  location.href = 'buscar.html?q=' + encodeURIComponent($('#q').value.trim());
});

/* El encabezado es fijo, así que al moverse con el teclado la página deja
   arriba un espacio igual a su altura real para que no tape el elemento con foco */
function ajustarEspacioEncabezado(){
  const h = $('header')?.offsetHeight || 0;
  document.documentElement.style.scrollPaddingTop = (h + 16) + 'px';
}
if(window.ResizeObserver && $('header')) new ResizeObserver(ajustarEspacioEncabezado).observe($('header'));

/* Si la dirección apunta a una pregunta de Ayuda, la pregunta se abre */
function abrirDetallesDelEnlace(){
  const d = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(d && d.tagName==='DETAILS'){ d.open = true; d.scrollIntoView(); }
}
addEventListener('hashchange', abrirDetallesDelEnlace);

/* ---------- Aviso cuando el catálogo no carga ----------
   Reemplaza el contenido de la página y deja el encabezado y el pie funcionando.
   El botón vuelve a pedir la página completa, que es lo que pide otra vez el catálogo */
function mostrarErrorCatalogo(){
  $('#app').innerHTML = `<div class="${TW.empty}" role="alert">
    <div class="${TW.emptyIcon}">${ICON.help}</div>
    <h1 class="${TW.emptyTitle}">No pudimos cargar los perfumes</h1>
    <p class="${TW.emptyP}">La tienda no pudo leer el catálogo en este momento. Intenta de nuevo en unos segundos.</p>
    <div class="${TW.emptyBtns}"><button type="button" class="${TW.btnGold}" id="reintentar">Reintentar</button></div>
  </div>`;
  $('#reintentar').addEventListener('click', () => location.reload());
  document.title = 'No pudimos cargar los perfumes | Maison Kage';
}

/* ---------- Inicio común ---------- */
ajustarEspacioEncabezado();
/* Sin catálogo limpiarCarrito dejaría el carrito vacío y lo guardaría así, por eso no corre */
if(CATALOGO_CAIDO) mostrarErrorCatalogo(); else limpiarCarrito();
renderAccountMenu();
renderAccUser();
updateCartBadge();
markNav();
abrirDetallesDelEnlace();
showFlash();
/* Sin catálogo no se toca el favorito pendiente, así sigue guardado para el siguiente intento */
if(currentUser() && !CATALOGO_CAIDO) aplicarFavoritoPendiente();
