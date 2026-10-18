/* MAISON KAGE · Carrito
   Quitar un producto es inmediato. En su lugar aparece un aviso con el botón Deshacer,
   que recibe el foco para que también se pueda usar con el teclado */
let quitado = null;
function undoHTML(){
  if(!quitado) return '';
  const p = byId(quitado.l.id);
  return `<div class="${TW.undoRow}" role="status"><p>${esc(p.nombre)} ${quitado.l.kind==='decant'?'decant ':''}${quitado.l.ml} ml se quitó del carrito.</p>
    <button type="button" class="${TW.btnOutline}" data-action="cart-undo" aria-label="Deshacer, volver a agregar ${esc(p.nombre)} ${quitado.l.ml} ml">Deshacer</button></div>`;
}
function renderCart(){
  if(!state.cart.length){ $('#app').innerHTML = undoHTML() + emptyCartHTML(); return; }
  const t = totals(), n = cartCount();
  $('#app').innerHTML = `
    <header class="${TW.pageHead}"><h1 class="${TW.pageTitleFocus}" tabindex="-1">Tu carrito</h1><p class="${TW.pageHeadP}">${n} ${n===1?'producto':'productos'} listos para el pago.</p></header>
    ${undoHTML()}
    <div class="${TW.cart}">
      <ul class="${TW.lines}">${state.cart.map(l => {
        const p = byId(l.id), key = lineKey(l), unit = unitPrice(l);
        const max = maxDe(p, l.kind, l.ml);
        const note = l.kind==='frasco' ? (l.qty>=max ? `<span class="${TW.alert}">Alcanzaste el stock disponible (${max})</span>` : `Stock disponible, ${max} unidades`) : (l.qty>=max?`<span class="${TW.alert}">Máximo ${max} por tamaño</span>`:'Preparado a mano en 24 horas');
        return `<li class="${TW.line}">
          <div class="${TW.lineImg}">${foto(p, l.kind==='decant'?'decant':'frente', (l.kind==='decant'?'Decant de ':'Frasco de ')+p.nombre+' de '+p.marca)}</div>
          <div class="${TW.lineInfo}"><p class="${TW.eyebrow}">${esc(p.marca)}</p><h2 class="${TW.lineName}"><a class="${TW.cardNameLink}" href="${urlProducto(p.id, l.kind==='decant')}">${esc(p.nombre)}</a></h2>
            <p class="${TW.small}">${l.kind==='decant'?`Decant ${l.ml} ml · atomizador de vidrio`:`Frasco ${l.ml} ml · ${p.conc}`}</p><p class="${TW.stock}">${note}</p></div>
          <p class="${TW.lineUnit}"><span class="sr-only">Precio unitario </span>${money(unit)}</p>
          <div class="${TW.lineQty}" role="group" aria-label="Cantidad de ${esc(p.nombre)} ${l.ml} ml">
            <button class="${TW.stepperBtn}" type="button" data-action="cart-qty" data-key="${key}" data-d="-1" aria-label="Restar una unidad" ${l.qty<=1?'disabled':''}>−</button>
            <output class="${TW.stepperOut}" aria-live="polite">${l.qty}</output>
            <button class="${TW.stepperBtn}" type="button" data-action="cart-qty" data-key="${key}" data-d="1" aria-label="Sumar una unidad" ${l.qty>=max?'disabled':''}>+</button>
          </div>
          <p class="${TW.lineTotal}"><span class="sr-only">Subtotal </span>${money(unit*l.qty)}</p>
          <button type="button" class="${TW.lineRm}" data-action="cart-remove" data-key="${key}" aria-label="Quitar ${esc(p.nombre)} ${l.ml} ml del carrito">${ICON.trash}</button>
        </li>`; }).join('')}
      </ul>
      <aside class="${TW.summary}" aria-labelledby="h-sum">
        <h2 class="${TW.summaryTitle}" id="h-sum">Resumen</h2>
        ${summaryRows(t)}
        <a class="${TW.summaryBtnGold}" href="checkout.html">Ir al checkout</a>
        <a class="${TW.summaryBtnOutline}" href="catalogo.html">Seguir comprando</a>
        <p class="${TW.secure}">${ICON.shield} Pago seguro con tarjeta o con Deuna</p>
      </aside>
    </div>`;
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-action]');
  if(!t) return;
  if(t.dataset.action==='cart-qty'){
    const l = state.cart.find(x => lineKey(x)===t.dataset.key), p = byId(l.id);
    const max = maxDe(p, l.kind, l.ml);
    l.qty = Math.min(max, Math.max(1, l.qty + +t.dataset.d));
    save(); updateCartBadge(); renderCart();
    const again = $(`[data-action=cart-qty][data-key="${t.dataset.key}"][data-d="${t.dataset.d}"]`);
    (again && !again.disabled ? again : $(`[data-action=cart-qty][data-key="${t.dataset.key}"]:not([disabled])`))?.focus();
  }
  if(t.dataset.action==='cart-remove'){
    const i = state.cart.findIndex(x => lineKey(x)===t.dataset.key);
    quitado = {l: state.cart[i], i};
    state.cart.splice(i, 1);
    save(); updateCartBadge(); renderCart();
    $('[data-action=cart-undo]').focus();
  }
  if(t.dataset.action==='cart-undo' && quitado){
    const {l, i} = quitado; quitado = null;
    if(!state.cart.some(x => lineKey(x)===lineKey(l))) state.cart.splice(Math.min(i, state.cart.length), 0, l);
    save(); updateCartBadge(); renderCart();
    $(`[data-action=cart-remove][data-key="${lineKey(l)}"]`)?.focus();
  }
});

renderCart();
