/* MAISON KAGE · Direcciones de envío
   La lista vive en el servidor. Después de cada cambio la página vuelve a pedirla y la dibuja,
   y deja la misma lista en SESION para que checkout la vea sin recargar */
if(!CATALOGO_CAIDO){
if(requireLogin()){
  const u = currentUser();
  const btn = $('#ad-toggle'), form = $('#ad-form'), caja = $('#addr-list');
  let ocupado = false;

  function renderAddresses(){
    caja.innerHTML = u.addresses.length ? u.addresses.map(a => `<article class="${TW.addr}" aria-labelledby="ad-${a.id}">
        <h3 class="${TW.addrTitle}" id="ad-${a.id}">${esc(a.alias)} ${a.principal?`<span class="${TW.statusCamino}">Principal</span>`:''}</h3>
        <p class="${TW.addrText}">${esc(a.dir)}</p><p class="${TW.addrText}">${esc(a.ciudad)} · ${esc(a.tel)}</p>${a.ref?`<p class="${TW.addrText}">${esc(a.ref)}</p>`:''}
        <div class="${TW.addrBtns}">${a.principal?'':`<button type="button" class="${TW.btnText}" data-action="addr-main" data-id="${a.id}">Usar como principal</button>`}
        <button type="button" class="${TW.btnText}" data-action="addr-del" data-id="${a.id}" aria-label="Eliminar dirección ${esc(a.alias)}">Eliminar</button></div>
      </article>`).join('')
      : `<p class="${TW.addrEmpty}">Todavía no tienes direcciones guardadas. Agrega una para pagar más rápido en tu próxima compra.</p>`;
  }
  const guardarLista = lista => { u.addresses = lista; renderAddresses(); };
  const mostrarError = msg => {
    caja.innerHTML = `<div class="${TW.addrEmpty}" role="alert"><p>${esc(msg)}</p>
      <button type="button" class="${TW.btnText} mt-2" data-action="addr-retry">Reintentar</button></div>`;
  };

  /* Pide la lista. Con carga visible la primera vez y al reintentar */
  async function cargar(conAviso){
    if(conAviso) caja.innerHTML = `<p class="${TW.addrEmpty}" role="status">Cargando tus direcciones…</p>`;
    try{ guardarLista(await api('GET', '/api/direcciones')); return true; }
    catch(err){ mostrarError(err.message); return false; }
  }
  /* Después de un cambio se vuelve a pedir la lista. Si esa lectura falla se usa la que contestó el cambio */
  async function refrescar(respaldo){
    try{ guardarLista(await api('GET', '/api/direcciones')); }
    catch(err){ respaldo ? guardarLista(respaldo) : mostrarError(err.message); }
  }

  const toggle = open => { form.hidden = !open; btn.setAttribute('aria-expanded', open); if(open) $('#ad-alias').focus(); else btn.focus(); };
  btn.onclick = () => toggle(form.hidden);
  $('#ad-cancel').onclick = () => toggle(false);

  const campoDelError = msg => /celular/i.test(msg) ? 'ad-tel' : /ciudad/i.test(msg) ? 'ad-ciudad' : /referencia/i.test(msg) ? 'ad-ref' : /nombre de la dirección/i.test(msg) ? 'ad-alias' : 'ad-dir';

  form.addEventListener('submit', e => {
    e.preventDefault();
    const boton = form.querySelector('[type=submit]');
    if(boton.getAttribute('aria-disabled')==='true' || !checkFilled(form, 'ad-errors')) return;
    conBoton(boton, 'Guardando…', async () => {
      let creada;
      try{ creada = await api('POST', '/api/direcciones', {alias:$('#ad-alias').value.trim(), dir:$('#ad-dir').value.trim(), ciudad:$('#ad-ciudad').value, ref:$('#ad-ref').value.trim(), tel:$('#ad-tel').value.trim()}); }
      catch(err){ return err.estado === 400 ? marcarError(campoDelError(err.message), err.message) : toast(err.message, {type:'error'}); }
      form.reset(); toggle(false);
      /* Si la lista no se puede leer, se suma la dirección creada a la que ya estaba en pantalla */
      await refrescar(u.addresses.concat(creada));
      toast('Dirección guardada.');
    });
  });

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action]');
    if(!t) return;
    if(t.dataset.action==='addr-retry'){ cargar(true); return; }
    if(t.dataset.action==='addr-main'){
      if(ocupado) return;
      ocupado = true;
      await conBoton(t, 'Guardando…', async () => {
        try{
          const lista = await api('PATCH', '/api/direcciones/' + encodeURIComponent(t.dataset.id), {principal:true});
          await refrescar(lista);
          toast('Dirección principal actualizada.');
        }catch(err){ toast(err.message, {type:'error'}); await refrescar(); }
      });
      ocupado = false;
      $('#acc-content h1').focus();
    }
    if(t.dataset.action==='addr-del'){
      if(ocupado) return;
      const ad = u.addresses.find(x => String(x.id)===t.dataset.id);
      if(!ad) return;
      if(await confirmDialog('¿Eliminar dirección?', `Se eliminará la dirección “${ad.alias}”. Esta acción no se puede deshacer.`, 'Sí, eliminar')){
        ocupado = true;
        await conBoton(t, 'Eliminando…', async () => {
          try{
            const lista = await api('DELETE', '/api/direcciones/' + encodeURIComponent(ad.id));
            await refrescar(lista);
            toast('Dirección eliminada.');
          }catch(err){ toast(err.message, {type:'error'}); await refrescar(); }
        });
        ocupado = false;
        $('#acc-content h1').focus();
      }
    }
  });
  cargar(true);
}
}
