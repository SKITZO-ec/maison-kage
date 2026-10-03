/* MAISON KAGE · Mis pedidos */
if(requireLogin()){
  const u = currentUser();
  const list = state.orders.filter(o => o.email === u.email);
  $('#orders').innerHTML = !list.length ? `
    <div class="${TW.empty}"><div class="${TW.emptyIcon}">${ICON.box}</div><h2 class="${TW.emptyTitle}">Aún no tienes pedidos</h2><p class="${TW.emptyP}">Cuando compres un frasco o un decant lo verás aquí, con su estado de envío.</p><div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Explorar el catálogo</a></div></div>` :
    `<p class="${TW.pageIntro}">${list.length} ${list.length===1?'pedido realizado':'pedidos realizados'}.</p>` +
    list.map(o => {
      const cls = o.estado==='Pago en verificación' ? 'verif' : o.estado==='Entregado' ? 'entregado' : o.estado==='En camino' ? 'camino' : 'prep';
      const status = {verif:TW.statusVerif, entregado:TW.statusEntregado, camino:TW.statusCamino, prep:TW.statusPrep}[cls];
      return `<article class="${TW.order}" aria-labelledby="o-${o.num}">
        <header class="${TW.orderHead}"><div><h3 class="${TW.orderTitle}" id="o-${o.num}">Pedido ${o.num}</h3><p class="${TW.orderMeta}">${o.fecha} · ${o.metodo==='Tarjeta'?'Tarjeta':'Deuna'}</p></div><span class="${status} ${TW.orderStatus}">${o.estado}</span><p class="${TW.orderTotal}"><span class="sr-only">Total </span>${money(o.total)}</p></header>
        ${cls==='verif' ? `<p class="${TW.orderNote}">${ICON.clock.replace('<svg','<svg width="16" height="16"')} Estamos confirmando tu pago con Deuna. No vuelvas a pagar, te avisaremos por correo y WhatsApp.</p>` : ''}
        <div class="px-5 pb-4">${entregaHTML(o)}</div>
        <details class="${TW.orderDetails}"><summary class="${TW.orderSummary}">Ver productos (${o.items.reduce((a,i)=>a+i.qty,0)})</summary><ul>${o.items.map(i=>`<li class="${TW.orderItem}"><span>${i.qty} × ${esc(i.nombre)} · ${i.desc}</span><span>${money(i.unit*i.qty)}</span></li>`).join('')}</ul></details>
      </article>`;
    }).join('');
}
