/* MAISON KAGE · Confirmación del pedido */
const o = state.lastOrder;
if(!o){
  $('#app').innerHTML = `<div class="${TW.empty}"><div class="${TW.emptyIcon}">${ICON.box}</div><h1 class="${TW.emptyTitle}">No hay un pedido reciente</h1><p class="${TW.emptyP}">Cuando confirmes un pago verás aquí el resumen de tu pedido.</p><div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Ir al catálogo</a></div></div>`;
} else {
  const verif = o.estado === 'Pago en verificación';
  const nombre = esc(o.envio.nombre.split(' ')[0]);
  const u = currentUser(), dt = TW.dt, dd = TW.dd;
  const nextBtn = u ? `<a class="${TW.btnGold}" href="pedidos.html">Ver mis pedidos</a>`
                    : `<a class="${TW.btnGold}" href="registro.html?email=${encodeURIComponent(o.email)}">Crear cuenta para seguir tu pedido</a>`;
  document.title = (verif ? 'Pedido recibido' : 'Pedido confirmado') + ' | Maison Kage';
  $('#app').innerHTML = `<div class="${TW.confirm}">
    <ol class="${TW.stepsCenter}" aria-label="Pasos de la compra">
      <li class="${TW.step}" data-done><span class="${TW.dot}">1</span>Carrito</li><li class="${TW.step}" data-done><span class="${TW.dot}">2</span>Envío y pago</li><li class="${TW.step}" aria-current="step"><span class="${TW.dot}">3</span>Confirmación</li>
    </ol>
    <span class="${verif ? TW.sealWait : TW.sealBig}" aria-hidden="true">${(verif?ICON.clock:ICON.check).replace('<svg','<svg width="40" height="40"')}</span>
    <h1 class="${TW.pageTitle}">${verif ? 'Pedido recibido' : '¡Pedido confirmado!'}</h1>
    ${verif
      ? `<p class="${TW.leadCenter}">Gracias, ${nombre}. Guardamos tu pedido <strong>${o.num}</strong> y estamos confirmando tu pago con Deuna. <strong>No vuelvas a pagar.</strong></p>
         <div class="${TW.nextBox}">
           <h2 class="${TW.miniTitle}">Qué pasa ahora</h2>
           <ol class="${TW.nextList}">
             <li>Revisamos tu pago con Deuna en máximo 15 minutos.</li>
             <li>Te avisamos por correo a <strong>${esc(o.email)}</strong> y por WhatsApp apenas se confirme.</li>
             <li>Si tienes el comprobante, envíalo por WhatsApp con tu número de pedido y lo revisamos de inmediato.</li>
           </ol>
           <a class="${TW.btnNavy}" href="https://www.whatsapp.com/?lang=es" target="_blank" rel="noopener">Enviar comprobante por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span></a>
         </div>`
      : `<p class="${TW.leadCenter}">Gracias, ${nombre}. Tu pago con ${o.metodo==='Tarjeta'?'tarjeta':'Deuna'} fue aprobado y tu número de pedido es <strong>${o.num}</strong>.</p>`}
    <div class="${TW.orderBox}">
      <h2 class="${TW.miniTitle}">Resumen del pedido</h2>
      <ul class="${TW.sumItems}">${o.items.map(i => `<li class="${TW.sumItem}"><span>${i.qty} × ${esc(i.nombre)} · ${i.desc}</span><span>${money(i.unit*i.qty)}</span></li>`).join('')}</ul>
      <dl class="${TW.dl}">
        <dt class="${dt}">${verif ? 'Total' : 'Total pagado'}</dt><dd class="${dd}"><strong>${money(o.total)}</strong></dd>
        <dt class="${dt}">Estado</dt><dd class="${dd}">${o.estado}</dd>
        <dt class="${dt}">${o.entrega==='retiro' ? 'Listo para retirar' : 'Entrega estimada'}</dt><dd class="${dd}">${o.entrega==='retiro' ? 'En 24 horas' : 'De 24 a 72 horas'}${verif ? ' después de confirmar el pago' : ''}. Los decants se preparan a mano el mismo día.</dd>
        <dt class="${dt}">Confirmación</dt><dd class="${dd}">Enviada a ${esc(o.email)}</dd>
      </dl>
      ${entregaHTML(o)}
    </div>
    <div class="${TW.btnRowCenter}">${nextBtn}<a class="${TW.btnOutline}" href="index.html">Seguir comprando</a></div>
  </div>`;
}
