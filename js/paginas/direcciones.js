/* MAISON KAGE · Direcciones de envío */
if(requireLogin()){
  const u = currentUser();
  const btn = $('#ad-toggle'), form = $('#ad-form');

  function renderAddresses(){
    $('#addr-list').innerHTML = u.addresses.length ? u.addresses.map(a => `<article class="${TW.addr}" aria-labelledby="ad-${a.id}">
        <h3 class="${TW.addrTitle}" id="ad-${a.id}">${esc(a.alias)} ${a.principal?`<span class="${TW.statusCamino}">Principal</span>`:''}</h3>
        <p class="${TW.addrText}">${esc(a.dir)}</p><p class="${TW.addrText}">${esc(a.ciudad)} · ${esc(a.tel)}</p>${a.ref?`<p class="${TW.addrText}">${esc(a.ref)}</p>`:''}
        <div class="${TW.addrBtns}">${a.principal?'':`<button type="button" class="${TW.btnText}" data-action="addr-main" data-id="${a.id}">Usar como principal</button>`}
        <button type="button" class="${TW.btnText}" data-action="addr-del" data-id="${a.id}" aria-label="Eliminar dirección ${esc(a.alias)}">Eliminar</button></div>
      </article>`).join('')
      : `<p class="${TW.addrEmpty}">Todavía no tienes direcciones guardadas. Agrega una para pagar más rápido en tu próxima compra.</p>`;
  }
  const toggle = open => { form.hidden = !open; btn.setAttribute('aria-expanded', open); if(open) $('#ad-alias').focus(); else btn.focus(); };
  btn.onclick = () => toggle(form.hidden);
  $('#ad-cancel').onclick = () => toggle(false);

  form.addEventListener('submit', e => {
    e.preventDefault();
    if(!checkFilled(form, 'ad-errors')) return;
    u.addresses.push({id:Date.now(), alias:$('#ad-alias').value.trim(), dir:$('#ad-dir').value.trim(), ciudad:$('#ad-ciudad').value, ref:$('#ad-ref').value.trim(), tel:$('#ad-tel').value.trim(), principal:!u.addresses.length});
    save(); form.reset(); toggle(false); renderAddresses();
    toast('Dirección guardada.');
  });

  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action]');
    if(!t) return;
    if(t.dataset.action==='addr-main'){
      u.addresses.forEach(x => x.principal = String(x.id)===t.dataset.id);
      save(); renderAddresses(); $('#acc-content h1').focus();
      toast('Dirección principal actualizada.');
    }
    if(t.dataset.action==='addr-del'){
      const ad = u.addresses.find(x => String(x.id)===t.dataset.id);
      if(await confirmDialog('¿Eliminar dirección?', `Se eliminará la dirección “${ad.alias}”. Esta acción no se puede deshacer.`, 'Sí, eliminar')){
        u.addresses = u.addresses.filter(x => x!==ad);
        if(ad.principal && u.addresses[0]) u.addresses[0].principal = true;
        save(); renderAddresses(); $('#acc-content h1').focus();
        toast('Dirección eliminada.');
      }
    }
  });
  renderAddresses();
}
