/* MAISON KAGE · Mis pedidos
   La lista viene del servidor, del más nuevo al más viejo. Mientras llega se avisa
   y si falla se muestra el mensaje con un botón para volver a pedirla */
if(!CATALOGO_CAIDO){
const fechaCorta = iso => new Date(iso).toLocaleDateString('es-EC', {day:'numeric', month:'short', year:'numeric'});

if(requireLogin()){
  const caja = $('#orders');

  async function cargar(){
    caja.innerHTML = `<p class="${TW.pageIntro}" role="status">Cargando tus pedidos…</p>`;
    let list;
    try{ list = await api('GET', '/api/pedidos'); }
    catch(err){
      caja.innerHTML = `<div class="${TW.addrEmpty}" role="alert"><p>${esc(err.message)}</p>
        <button type="button" class="${TW.btnText} mt-2" id="ord-retry">Reintentar</button></div>`;
      $('#ord-retry').onclick = cargar;
      return;
    }
    pintar(list);
  }

  function pintar(list){
    caja.innerHTML = !list.length ? `
    <div class="${TW.empty}"><div class="${TW.emptyIcon}">${ICON.box}</div><h2 class="${TW.emptyTitle}">Aún no tienes pedidos</h2><p class="${TW.emptyP}">Cuando compres un frasco o un decant lo verás aquí, con su estado de envío.</p><div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="/catalogo.html">Explorar los perfumes</a></div></div>` :
    `<p class="${TW.pageIntro}">${list.length} ${list.length===1?'pedido realizado':'pedidos realizados'}.</p>` +
    list.map(o => {
      /* El estado lo calcula la base con el tiempo. Listo para retirar usa el mismo color que En camino */
      const cls = o.estado==='Pago en verificación' ? 'verif' : o.estado==='Entregado' ? 'entregado' : (o.estado==='En camino' || o.estado==='Listo para retirar') ? 'camino' : 'prep';
      const status = {verif:TW.statusVerif, entregado:TW.statusEntregado, camino:TW.statusCamino, prep:TW.statusPrep}[cls];
      return `<article class="${TW.order}" aria-labelledby="o-${o.num}">
        <header class="${TW.orderHead}"><div><h3 class="${TW.orderTitle}" id="o-${o.num}">Pedido ${o.num}</h3><p class="${TW.orderMeta}">${fechaCorta(o.fecha)} · ${o.metodo==='Tarjeta'?'Tarjeta':'Deuna'}</p></div><span class="${status} ${TW.orderStatus}">${o.estado}</span><p class="${TW.orderTotal}"><span class="sr-only">Total </span>${money(o.total)}</p></header>
        ${cls==='verif' ? `<p class="${TW.orderNote}">${ICON.clock.replace('<svg','<svg width="16" height="16"')} Estamos confirmando tu pago con Deuna. No vuelvas a pagar, te avisaremos por correo y WhatsApp.</p>` : ''}
        <div class="px-5 pb-4">${entregaHTML(o)}</div>
        <details class="${TW.orderDetails}"><summary class="${TW.orderSummary}">Ver productos (${o.items.reduce((a,i)=>a+i.qty,0)})</summary><ul>${o.items.map(i=>`<li class="${TW.orderItem}"><span>${i.qty} × ${esc(i.nombre)} · ${i.desc}</span><span>${money(i.unit*i.qty)}</span></li>`).join('')}</ul></details>
      </article>`;
    }).join('');
  }

  cargar();
}
}
