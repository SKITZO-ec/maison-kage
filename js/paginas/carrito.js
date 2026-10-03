/* MAISON KAGE · Carrito */
function renderCart(){
  if(!state.cart.length){ $('#app').innerHTML = emptyCartHTML(); return; }
  const t = totals(), n = cartCount();
  $('#app').innerHTML = `
    <header class="${TW.pageHead}"><h1 class="${TW.pageTitleFocus}" tabindex="-1">Tu carrito</h1><p class="${TW.pageHeadP}">${n} ${n===1?'producto':'productos'} listos para el pago.</p></header>
    <div class="${TW.cart}">
      <ul class="${TW.lines}">${state.cart.map(l => {
        const p = byId(l.id), key = lineKey(l), unit = unitPrice(l);
        const max = l.kind==='frasco' ? p.stock - frascoUsed(p.id, key) : DEC_MAX;
        const note = l.kind==='frasco' ? (l.qty>=max ? `<span class="${TW.alert}">Alcanzaste el stock disponible (${p.stock})</span>` : `Stock disponible, ${p.stock} unidades`) : (l.qty>=DEC_MAX?`<span class="${TW.alert}">Máximo ${DEC_MAX} por tamaño</span>`:'Preparado a mano en 24 horas');
        return `<li class="${TW.line}">
          <div class="${TW.lineImg}">${foto(p, l.kind==='decant'?'decant':'frente', (l.kind==='decant'?'Decant de ':'Frasco de ')+p.nombre+' de '+p.marca)}</div>
          <div class="${TW.lineInfo}"><p class="${TW.eyebrow}">${esc(p.marca)}</p><h2 class="${TW.lineName}"><a class="${TW.cardNameLink}" href="producto.html?id=${p.id}${l.kind==='decant'?'&formato=decant':''}">${esc(p.nombre)}</a></h2>
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
    const max = l.kind==='frasco' ? p.stock - frascoUsed(p.id, lineKey(l)) : DEC_MAX;
    l.qty = Math.min(max, Math.max(1, l.qty + +t.dataset.d));
    save(); updateCartBadge(); renderCart();
    const again = $(`[data-action=cart-qty][data-key="${t.dataset.key}"][data-d="${t.dataset.d}"]`);
    (again && !again.disabled ? again : $(`[data-action=cart-qty][data-key="${t.dataset.key}"]:not([disabled])`))?.focus();
  }
  if(t.dataset.action==='cart-remove'){
    const l = state.cart.find(x => lineKey(x)===t.dataset.key), p = byId(l.id);
    if(await confirmDialog('¿Quitar del carrito?', `Se quitará ${p.nombre} ${l.kind==='decant'?'decant ':''}${l.ml} ml de tu carrito. Puedes volver a agregarlo cuando quieras.`, 'Sí, quitar')){
      state.cart = state.cart.filter(x => x!==l);
      save(); updateCartBadge(); renderCart();
      $('#app h1')?.focus();
      toast(`${p.nombre} se quitó del carrito.`);
    }
  }
});

renderCart();
