/* =========================================================
   MAISON KAGE · Funciones comunes de todas las páginas
   Orden de carga: datos.js, estado.js, comun.js, script de la página
   ========================================================= */

/* ---------- Utilidades ---------- */
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const money = n => '$' + n.toFixed(2);
const byId = id => PRODUCTS.find(p => p.id === id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const finalPrice = (p, ml) => { const b = ml === 100 ? p.p100 : p.p50; return p.oferta ? Math.round(b * (100 - p.oferta)) / 100 : b; };
const basePrice = (p, ml) => ml === 100 ? p.p100 : p.p50;
const decPrice = (p, ml) => p.dec[DEC_SIZES.indexOf(ml)];
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
function foto(p, vista, label, variant='ph', decorative=false){
  const img = `<img class="${TW.phImg}" src="${fotoSrc(p, vista)}" alt="" loading="lazy" decoding="async" onerror="fotoError(this)">`;
  return ph(label, variant, decorative).replace(/<\/div>$/, img + '</div>');
}

/* ---------- Favoritos ---------- */
const isFav = id => state.favs.includes(id);
function favBtn(p, inline=false){
  const on = isFav(p.id);
  return `<button type="button" class="${inline ? TW.favInline : TW.fav}" data-action="fav" data-id="${p.id}" aria-pressed="${on}" aria-label="${on?'Quitar':'Guardar'} ${esc(p.nombre)} ${on?'de':'en'} favoritos">${ICON.heart}</button>`;
}

/* Tarjeta de producto única, igual en todas las páginas */
/* modo 'decant': la tarjeta muestra primero el precio y los tamaños del decant y lleva a la ficha con Decant elegido */
function card(p, modo=''){
  if(typeof modo !== 'string') modo = '';
  const dec = modo==='decant';
  const url = `producto.html?id=${p.id}${dec?'&formato=decant':''}`;
  const price = finalPrice(p,50);
  const media = `<a class="${TW.cardMediaLink}" href="${url}" tabindex="-1">
      ${foto(p, dec?'decant':'frente', (dec?'Decant de ':'Frasco de ')+p.nombre+' de '+p.marca)}
      ${!dec && p.oferta ? `<span class="${TW.cardSeal}" aria-label="Oferta, ${p.oferta} por ciento de descuento">-${p.oferta}%</span>` : ''}
      ${dec ? `<span class="${TW.cardTagGold}">Decant</span>` : p.stock===0 ? `<span class="${TW.cardTag}">Frasco agotado</span>` : p.tend ? `<span class="${TW.cardTagGold}">Tendencia</span>` : ''}
    </a>`;
  const head = `${favBtn(p)}
    <p class="${TW.cardBrand}">${esc(p.marca)} · ${TIPOS[p.tipo]}</p>
    <h3 class="${TW.cardName}" id="c-${p.id}"><a class="${TW.cardNameLink}" href="${url}">${esc(p.nombre)}</a></h3>
    <p class="${TW.cardMeta}">${PUBLICOS[p.publico]} · ${p.conc}</p>`;
  const body = dec ? `
    <p class="${TW.price}"><small class="${TW.priceFrom}">Decant desde </small>${money(p.dec[0])}</p>
    <p class="${TW.decSizes}" aria-label="Tamaños disponibles ${DEC_SIZES.join(', ')} mililitros">${DEC_SIZES.map(ml=>`<span class="${TW.decSize}">${ml} ml</span>`).join('')}</p>
    <p class="${TW.cardDec}">Frasco 50 ml ${p.stock===0 ? 'agotado' : 'desde '+money(price)}</p>
    <a class="${TW.cardBtn}" href="${url}" aria-label="Elegir tamaño de decant de ${esc(p.nombre)}">Elegir tamaño</a>` : `
    <p class="${TW.price}">${money(price)}${p.oferta?`<s class="${TW.priceOld}"><span class="sr-only">Precio anterior </span>${money(p.p50)}</s>`:''}<small class="${TW.priceUnit}">50 ml</small></p>
    <p class="${TW.cardDec}">${ICON.drop} Decant desde ${money(p.dec[0])}</p>
    <a class="${TW.cardBtn}" href="${url}" aria-label="Ver detalle de ${esc(p.nombre)}">Ver detalle</a>`;
  return `<article class="${TW.card}" aria-labelledby="c-${p.id}">
    ${media}
    ${head}${body}
  </article>`;
}

/* ---------- Carrito ---------- */
const lineKey = l => `${l.id}|${l.kind}|${l.ml}`;
const cartCount = () => state.cart.reduce((a,l)=>a+l.qty,0);
const unitPrice = l => { const p = byId(l.id); return l.kind==='decant' ? decPrice(p,l.ml) : finalPrice(p,l.ml); };
/* entrega: 'envio' (a domicilio) o 'retiro' (en el local, sin costo) */
function totals(entrega='envio'){
  const sub = state.cart.reduce((a,l)=>a+unitPrice(l)*l.qty,0);
  const ship = entrega==='retiro' || sub===0 || sub>=FREE_SHIP ? 0 : SHIP;
  return {sub, ship, total: sub+ship, entrega};
}
const frascoUsed = (id, exceptKey) => state.cart.filter(l=>l.id===id && l.kind==='frasco' && lineKey(l)!==exceptKey).reduce((a,l)=>a+l.qty,0);

function addToCart(id, kind, ml, qty, silent=false){
  const p = byId(id);
  const line = state.cart.find(l=>l.id===id && l.kind===kind && l.ml===ml);
  if(kind==='frasco'){
    const used = frascoUsed(id);
    if(used + qty > p.stock){
      toast(p.stock===0 ? `${p.nombre} está agotado en frasco. Puedes llevarlo como decant.` : `Solo hay ${p.stock} unidades de ${p.nombre} y ya tienes ${used} en tu carrito.`, {type:'error'});
      return false;
    }
  } else if((line?line.qty:0) + qty > DEC_MAX){
    toast(`Puedes llevar hasta ${DEC_MAX} decants de ${ml} ml del mismo perfume.`, {type:'error'});
    return false;
  }
  if(line) line.qty += qty; else state.cart.push({id, kind, ml, qty});
  save(); updateCartBadge();
  if(!silent) toast(`Agregado al carrito: ${p.nombre}, ${kind==='decant'?'decant ':'frasco '}${ml} ml`, {link:['Ver carrito','carrito.html']});
  return true;
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
    <p class="${TW.emptyP}">Todavía no agregas perfumes. Explora el catálogo o empieza con un decant de 2 ml para conocer una fragancia sin gastar en el frasco.</p>
    <div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Explorar el catálogo</a><a class="${TW.btnOutline}" href="catalogo.html?decant=1">Ver decants</a></div>
  </div>`;
}
function summaryRows(t){
  return `<div class="${TW.srow}"><span>Subtotal</span><span>${money(t.sub)}</span></div>
    <div class="${TW.srow}"><span>${t.entrega==='retiro'?'Retiro en el local':'Envío a domicilio'}</span><span>${t.ship===0?'Gratis':money(t.ship)}</span></div>
    ${t.ship>0?`<p class="${TW.shipHint}">Te faltan ${money(FREE_SHIP-t.sub)} para el envío gratis, o retira gratis en nuestro local en Quito.</p>`:''}
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
      <p class="${TW.small}">Copia la guía y pégala en la página de Servientrega. El rastreo se activa cuando el pedido sale de nuestro local, normalmente el mismo día.</p>
    </div>`;
}

/* ---------- Avisos (toast) ---------- */
function toast(msg, {type='ok', link}={}){
  const r = $('#toast-region');
  r.setAttribute('aria-live', type==='error' ? 'assertive' : 'polite');
  const el = document.createElement('div');
  el.className = type==='error' ? TW.toastError : TW.toast;
  el.innerHTML = `<p class="${TW.toastText}">${esc(msg)}</p>${link?`<a class="${TW.toastLink}" href="${link[1]}">${link[0]}</a>`:''}<button type="button" class="${TW.toastX}" data-toast-close aria-label="Cerrar aviso">×</button>`;
  r.innerHTML = ''; r.appendChild(el);
  el.querySelector('[data-toast-close]').onclick = () => el.remove();
  clearTimeout(toast.t); toast.t = setTimeout(()=>el.remove(), 5500);
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
function cancelModal(){ const fn = modalCtx?.onCancel; closeModal(); fn && fn(); }
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
const currentUser = () => state.user ? state.accounts[state.user] || null : null;
const newAccount = (nombre, apellido, email) => ({nombre, apellido, email, tel:'', nac:'', addresses:[]});
const nameFromEmail = email => { const n = email.split('@')[0].split(/[._\-0-9]+/).filter(Boolean)[0] || 'cliente'; return n[0].toUpperCase() + n.slice(1); };

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
/* Las páginas de Mi cuenta piden sesión iniciada */
function requireLogin(){
  if(currentUser()) return true;
  location.replace('login.html?next=' + encodeURIComponent(PAGE));
  return false;
}

/* ---------- Formularios: solo se revisa que los campos estén llenos ---------- */
function field({id, label, type='text', value='', help='', auto='', req=true, attrs='', tight=false}){
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
  const cat = $('[data-nav="catalogo"]');
  if(PAGE==='catalogo.html' && !location.search) cat.setAttribute('aria-current','page');
  if($$('#mega a').some(a => a.getAttribute('href')===here)) $('#btn-perfumes').setAttribute('aria-current','true');
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
  if(a==='back'){ history.length>1 ? history.back() : (location.href='index.html'); return; }
  if(a==='focus-field'){ document.getElementById(t.dataset.target)?.focus(); return; }
  if(a==='fav'){
    const id = t.dataset.id, p = byId(id), on = !isFav(id);
    state.favs = on ? [...state.favs, id] : state.favs.filter(x => x!==id);
    save();
    $$(`[data-action="fav"][data-id="${id}"]`).forEach(b => { b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', `${on?'Quitar':'Guardar'} ${p.nombre} ${on?'de':'en'} favoritos`); });
    toast(on ? `${p.nombre} se guardó en tus favoritos.` : `${p.nombre} se quitó de tus favoritos.`, on ? {link:['Ver favoritos','favoritos.html']} : {});
    document.dispatchEvent(new CustomEvent('mk:favs'));
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
    if(await confirmDialog('¿Cerrar sesión?', 'Tu carrito se mantiene en este dispositivo. Para ver tus pedidos tendrás que volver a ingresar.', 'Cerrar sesión')){
      state.user = null; save();
      flash('Cerraste sesión correctamente.');
      location.href = 'index.html';
    }
  }
});

/* Buscador de la barra superior */
$('#search-form').addEventListener('submit', e => {
  e.preventDefault();
  location.href = 'buscar.html?q=' + encodeURIComponent($('#q').value.trim());
});

/* ---------- Inicio común ---------- */
renderAccountMenu();
renderAccUser();
updateCartBadge();
markNav();
showFlash();
