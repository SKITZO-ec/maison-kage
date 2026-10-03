/* MAISON KAGE · Checkout: datos de envío, método de pago y pasarela simulada
   En alta fidelidad, "Tarjeta" se reemplaza por la Cajita de Pagos de Payphone
   y "Deuna" por un QR dinámico de un agregador (por ejemplo Pagomedios). */
const nextOrderNum = () => 'MK-' + String(1000 + state.orderSeq);

if(!state.cart.length) $('#app').innerHTML = emptyCartHTML();
else renderCheckout();

function renderCheckout(){
  const t = totals(), u = currentUser();
  const a = u ? (u.addresses.find(x => x.principal) || {}) : {};
  $('#app').innerHTML = `
    <ol class="${TW.steps}" aria-label="Pasos de la compra">
      <li class="${TW.step}" data-done><span class="${TW.dot}">${ICON.check.replace('<svg','<svg width="14" height="14"')}</span>Carrito</li>
      <li class="${TW.step}" aria-current="step"><span class="${TW.dot}">2</span>Entrega y pago</li>
      <li class="${TW.step}"><span class="${TW.dot}">3</span>Confirmación</li>
    </ol>
    <header class="${TW.pageHead}"><h1 class="${TW.pageTitle}">Checkout</h1><p class="${TW.pageHeadP}">${u ? 'Completamos lo que ya tenemos de tu cuenta. Puedes cambiarlo aquí mismo.' : '<a class="underline" href="login.html?next=checkout.html">Inicia sesión</a> para usar tus datos guardados, o compra como invitado.'}</p></header>
    <div class="${TW.coGrid}">
      <form id="co-form" novalidate>
        <div class="${TW.errSummary}" id="co-errors" tabindex="-1" role="alert" hidden></div>
        <section class="${TW.coSection}" aria-labelledby="h-envio">
          <h2 class="${TW.coTitle}" id="h-envio">1. Datos de contacto</h2>
          <p class="${TW.reqNote}">Los campos con <span class="${TW.req}">*</span> son obligatorios.</p>
          <div class="${TW.two}">
            ${field({id:'co-nombre', label:'Nombre y apellido', value:u ? (u.nombre+' '+u.apellido).trim() : '', auto:'name'})}
            ${field({id:'co-email', label:'Correo electrónico', type:'email', value:u ? u.email : '', auto:'email', help:'Aquí te llega la confirmación'})}
          </div>
          ${field({id:'co-tel', label:'Celular', type:'tel', value:a.tel || (u ? u.tel : ''), auto:'tel', help:'Para avisarte el estado de tu pedido. 10 dígitos, por ejemplo 0991234567'})}
        </section>
        <section class="${TW.coSection}" aria-labelledby="h-entrega">
          <h2 class="${TW.coTitle}" id="h-entrega">2. Entrega</h2>
          <fieldset class="${TW.pay}"><legend class="sr-only">Elige cómo recibir tu pedido</legend>
            <label class="${TW.payOpt}"><input class="${TW.payInput}" type="radio" name="entrega" value="envio" checked><span><strong class="${TW.payStrong}">Envío a domicilio</strong><span class="${TW.payText}">Con Servientrega a todo Ecuador en 24 a 72 horas. ${t.sub>=FREE_SHIP?'Gratis en esta compra.':money(SHIP)+', gratis desde '+money(FREE_SHIP)+'.'}</span></span><span class="${TW.payStrong} text-right">${t.sub>=FREE_SHIP?'Gratis':money(SHIP)}</span></label>
            <label class="${TW.payOpt}"><input class="${TW.payInput}" type="radio" name="entrega" value="retiro"><span><strong class="${TW.payStrong}">Retiro en el local</strong><span class="${TW.payText}">Quito. ${LOCAL.plazo}.</span></span><span class="${TW.payStrong} text-right">Gratis</span></label>
          </fieldset>
          <div id="co-envio" class="mt-5">
            ${selectField('co-ciudad','Ciudad',a.ciudad||'')}
            ${field({id:'co-dir', label:'Dirección', value:a.dir||'', auto:'street-address', help:'Calle principal, número y calle secundaria'})}
            ${field({id:'co-ref', label:'Referencia', value:a.ref||'', req:false})}
          </div>
          <div id="co-retiro" class="${TW.storeInfo}" hidden>
            <p class="${TW.deliveryTitle}">${ICON.store} Maison Kage, local Quito</p>
            <p>${LOCAL.dir}</p><p>${LOCAL.horario}</p>
            <p>Te avisamos por correo y WhatsApp cuando esté listo. Tienes ${LOCAL.dias} días para retirarlo con tu número de pedido y tu cédula.</p>
          </div>
        </section>
        <section class="${TW.coSection}" aria-labelledby="h-pago">
          <h2 class="${TW.coTitle}" id="h-pago">3. Método de pago</h2>
          <fieldset class="${TW.pay}"><legend class="sr-only">Elige cómo pagar</legend>
            <label class="${TW.payOpt}"><input class="${TW.payInput}" type="radio" name="pago" value="Tarjeta" checked><span><strong class="${TW.payStrong}">Tarjeta de crédito o débito</strong><span class="${TW.payText}">Visa, Mastercard o Diners. El pago se aprueba al instante.</span></span>${ph('Logotipos de tarjetas','phLogo')}</label>
            <label class="${TW.payOpt}"><input class="${TW.payInput}" type="radio" name="pago" value="Deuna"><span><strong class="${TW.payStrong}">Deuna</strong><span class="${TW.payText}">Escanea un código QR con la app Deuna. Tu pedido se confirma solo, en segundos.</span></span>${ph('Logotipo de Deuna','phLogo')}</label>
          </fieldset>
          <p class="${TW.secure}">${ICON.shield} Pasarela simulada. Este prototipo no realiza ningún cargo real.</p>
        </section>
      </form>
      <aside class="${TW.summary}" aria-labelledby="h-co-sum">
        <h2 class="${TW.summaryTitle}" id="h-co-sum">4. Resumen</h2>
        <ul class="${TW.sumItems}">${state.cart.map(l => { const p = byId(l.id); return `<li class="${TW.sumItem}"><span>${l.qty} × ${esc(p.nombre)} · ${l.kind==='decant'?'decant ':''}${l.ml} ml</span><span>${money(unitPrice(l)*l.qty)}</span></li>`; }).join('')}</ul>
        <div id="co-totals" aria-live="polite">${summaryRows(t)}</div>
        <button type="submit" form="co-form" class="${TW.summaryBtnGold}" id="co-submit">Continuar al pago · ${money(t.total)}</button>
        <a href="carrito.html" class="${TW.summaryBtnOutline}">Volver al carrito</a>
      </aside>
    </div>`;
  /* Al cambiar la entrega se muestran u ocultan los campos de dirección y se recalcula el total */
  const setEntrega = modo => {
    const envio = modo==='envio';
    $('#co-envio').hidden = !envio; $('#co-retiro').hidden = envio;
    ['co-ciudad','co-dir'].forEach(id => {
      const el = $('#'+id);
      if(envio) el.setAttribute('aria-required','true');
      else { el.removeAttribute('aria-required'); el.removeAttribute('aria-invalid'); $('#err-'+id).hidden = true; }
    });
    const tt = totals(modo);
    $('#co-totals').innerHTML = summaryRows(tt);
    $('#co-submit').textContent = 'Continuar al pago · ' + money(tt.total);
  };
  $$('input[name=entrega]').forEach(r => r.addEventListener('change', e => setEntrega(e.target.value)));

  $('#co-form').addEventListener('submit', e => {
    e.preventDefault();
    if(!checkFilled(e.target, 'co-errors')) return;
    const f = e.target;
    const data = {nombre:f['co-nombre'].value.trim(), email:f['co-email'].value.trim().toLowerCase(), tel:f['co-tel'].value.trim(),
                  ciudad:f['co-ciudad'].value, dir:f['co-dir'].value.trim(), ref:f['co-ref'].value.trim(),
                  entrega:f.querySelector('input[name=entrega]:checked').value};
    if(data.entrega==='retiro'){ data.ciudad = 'Quito'; data.dir = 'Retiro en el local'; data.ref = ''; }
    const metodo = f.querySelector('input[name=pago]:checked').value;
    metodo==='Tarjeta' ? payCard(data) : payDeuna(data);
  });
}

/* ---------- Pago con tarjeta (en alta fidelidad: Cajita de Pagos de Payphone) ---------- */
function payCard(data){
  const t = totals(data.entrega), num = nextOrderNum();
  let timer;
  openModal('Pagar con tarjeta', `<div class="${TW.gw}">
      <p class="${TW.eyebrow}">Pasarela simulada</p>
      <p id="modal-desc" class="${TW.gwOrder}">Pedido <strong>${num}</strong> · Total <strong>${money(t.total)}</strong></p>
      <form id="card-form" class="${TW.gwForm}" novalidate>
        <div class="${TW.errSummary}" id="card-errors" tabindex="-1" role="alert" hidden></div>
        ${field({id:'cd-num', label:'Número de tarjeta', auto:'cc-number', attrs:'inputmode="numeric" maxlength="19" data-rule="card"', tight:true})}
        ${field({id:'cd-name', label:'Nombre del titular', auto:'cc-name', tight:true})}
        <div class="${TW.twoKeep}">
          ${field({id:'cd-exp', label:'Vencimiento', help:'MM/AA', auto:'cc-exp', attrs:'maxlength="5" data-rule="exp"', tight:true})}
          ${field({id:'cd-cvv', label:'CVV', help:'3 dígitos', auto:'cc-csc', attrs:'inputmode="numeric" maxlength="3" data-rule="cvv"', tight:true})}
        </div>
        <p class="${TW.secure}">${ICON.shield} No escribas datos reales, es un prototipo.</p>
      </form>
      <p id="gw-status" class="${TW.gwStatus}" role="status" hidden></p>
    </div>`,
    [{label:'Cancelar', cls:TW.btnOutline, id:'gw-cancel', fn:() => { clearTimeout(timer); closeModal(); toast('Pago cancelado. Tu carrito sigue intacto.'); }},
     {label:'Pagar ' + money(t.total), cls:TW.btnGold, id:'gw-pay', fn:() => {
        if(!checkFilled($('#card-form'), 'card-errors')) return;
        $('#gw-pay').disabled = $('#gw-cancel').disabled = true;
        const st = $('#gw-status'); st.hidden = false; st.textContent = 'Procesando el pago con tu banco…';
        timer = setTimeout(() => {
          st.textContent = 'Pago aprobado. Generando tu pedido…';
          timer = setTimeout(() => { createOrder(data, 'Tarjeta', 'En preparación', num); location.href = 'confirmacion.html'; }, 900);
        }, 1600);
     }}],
    {onCancel:() => { clearTimeout(timer); toast('Pago cancelado. Tu carrito sigue intacto.'); }});
  $('#card-form').addEventListener('submit', e => { e.preventDefault(); $('#gw-pay').click(); });
  $('#cd-num').focus();
}

/* ---------- Pago con Deuna (QR dinámico con confirmación automática) ----------
   Pensado para que la persona nunca se quede con la duda de si la estafaron:
   el pedido ya tiene número antes de pagar, el QR muestra monto y comercio,
   hay tiempo límite visible, pasos que avanzan solos y una salida clara
   ("Ya pagué y no se actualiza") que deja el pedido guardado en verificación. */
function payDeuna(data){
  const t = totals(data.entrega), num = nextOrderNum();
  let secs = 600, tick, t1, t2;
  const stop = () => { clearInterval(tick); clearTimeout(t1); clearTimeout(t2); };
  const fmt = s => String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  const dt = TW.gwDt, dd = TW.gwDd;
  openModal('Pagar con Deuna', `<div class="${TW.gw}">
      <p class="${TW.eyebrow}">Pasarela simulada</p>
      <p id="modal-desc" class="${TW.gwOrder}">Pedido <strong>${num}</strong> reservado. Aún no se ha cobrado nada.</p>
      ${ph('Código QR de Deuna por ' + money(t.total), 'phQr')}
      <dl class="${TW.gwData}">
        <dt class="${dt}">Monto exacto</dt><dd class="${dd}">${money(t.total)}</dd>
        <dt class="${dt}">Comercio que verás en la app</dt><dd class="${dd}">Maison Kage</dd>
        <dt class="${dt}">El código vence en</dt><dd class="${dd}" id="gw-timer">${fmt(secs)}</dd>
      </dl>
      <ol class="${TW.gwSteps}" id="gw-steps" aria-label="Estado del pago">
        <li class="${TW.gwStep}" aria-current="step"><span class="${TW.gwDot}">1</span>Escanea y paga en la app Deuna</li>
        <li class="${TW.gwStep}"><span class="${TW.gwDot}">2</span>Recibimos tu pago</li>
        <li class="${TW.gwStep}"><span class="${TW.gwDot}">3</span>Pedido confirmado</li>
      </ol>
      <p id="gw-status" class="${TW.gwStatus}" role="status">Esperando tu pago. Normalmente se confirma en menos de 30 segundos, no cierres esta ventana.</p>
      <p class="${TW.gwLinks}"><button type="button" class="${TW.btnText}" id="gw-renew" hidden>Generar un código nuevo</button>
      <button type="button" class="${TW.btnText}" id="gw-late">Ya pagué y no se actualiza</button></p>
    </div>`,
    [{label:'Cancelar pago', cls:TW.btnOutline, id:'gw-cancel', fn:() => { stop(); closeModal(); toast('Pago cancelado. No se cobró nada y tu carrito sigue intacto.'); }},
     {label:'Simular pago en la app', cls:TW.btnGold, id:'gw-sim', fn:() => {
        clearInterval(tick);
        $('#gw-sim').disabled = $('#gw-cancel').disabled = $('#gw-late').disabled = true;
        const steps = $$('#gw-steps li');
        const advance = i => { steps.forEach((li,j) => { li.toggleAttribute('data-done', j<i); j===i ? li.setAttribute('aria-current','step') : li.removeAttribute('aria-current'); if(j<i) li.firstElementChild.innerHTML = ICON.check.replace('<svg','<svg width="14" height="14"'); }); };
        advance(1); $('#gw-status').textContent = 'Recibimos tu pago. Confirmando tu pedido…';
        t1 = setTimeout(() => {
          advance(2); $('#gw-status').textContent = 'Pago aprobado. Pedido confirmado.';
          t2 = setTimeout(() => { createOrder(data, 'Deuna', 'En preparación', num); location.href = 'confirmacion.html'; }, 900);
        }, 1400);
     }}],
    {onCancel:() => { stop(); toast('Pago cancelado. No se cobró nada y tu carrito sigue intacto.'); }});

  const startTimer = () => {
    clearInterval(tick);
    tick = setInterval(() => {
      secs--; $('#gw-timer').textContent = fmt(Math.max(secs,0));
      if(secs<=0){
        clearInterval(tick);
        $('#gw-status').textContent = 'El código venció sin recibir el pago. Genera uno nuevo para continuar.';
        $('#gw-renew').hidden = false; $('#gw-sim').disabled = true;
      }
    }, 1000);
  };
  $('#gw-renew').onclick = () => { secs = 600; $('#gw-timer').textContent = fmt(secs); $('#gw-renew').hidden = true; $('#gw-sim').disabled = false; $('#gw-status').textContent = 'Código nuevo listo. Esperando tu pago.'; startTimer(); };
  $('#gw-late').onclick = () => { stop(); createOrder(data, 'Deuna', 'Pago en verificación', num); location.href = 'confirmacion.html'; };
  startTimer();
}

/* ---------- Crear el pedido ---------- */
function createOrder(data, metodo, estado, num){
  const items = state.cart.map(l => { const p = byId(l.id); return {nombre:p.nombre, desc:(l.kind==='decant'?'Decant ':'Frasco ')+l.ml+' ml', qty:l.qty, unit:unitPrice(l)}; });
  const o = {num, fecha:new Date().toLocaleDateString('es-EC',{day:'numeric',month:'short',year:'numeric'}), estado, metodo, items,
             total:totals(data.entrega).total, email:data.email, entrega:data.entrega,
             /* Guía simulada de 12 dígitos. En producción la entrega Servientrega al generar el envío */
             guia:data.entrega==='envio' ? String(Math.floor(1e11 + Math.random()*9e11)) : null,
             envio:{nombre:data.nombre, dir:data.dir, ciudad:data.ciudad, tel:data.tel}};
  state.orderSeq++; state.orders.unshift(o); state.lastOrder = o; state.cart = [];
  /* Si hay sesión, se guardan el celular y la primera dirección para la próxima compra */
  const u = currentUser();
  if(u){
    if(!u.tel) u.tel = data.tel;
    if(!u.addresses.length && data.entrega==='envio') u.addresses.push({id:Date.now(), alias:'Principal', dir:data.dir, ciudad:data.ciudad, ref:data.ref, tel:data.tel, principal:true});
  }
  save();
}
