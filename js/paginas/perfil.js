/* MAISON KAGE · Mi perfil
   Datos personales y cambio de contraseña. Cambiar el correo pide la contraseña actual.
   El servidor revisa las contraseñas y guarda los cambios */
if(requireLogin()){
  const u = currentUser();
  $('#pf-nombre').value = u.nombre;
  $('#pf-apellido').value = u.apellido;
  $('#pf-email').value = u.email;
  $('#pf-tel').value = u.tel;
  $('#pf-nac').value = u.nac;

  /* La contraseña actual solo aparece cuando el correo cambia */
  const pedirPass = () => {
    const cambia = $('#pf-email').value.trim().toLowerCase() !== u.email;
    $('#pf-pass-box').hidden = !cambia;
    cambia ? $('#pf-pass').setAttribute('aria-required','true') : ($('#pf-pass').removeAttribute('aria-required'), $('#pf-pass').value = '');
  };
  $('#pf-email').addEventListener('input', pedirPass);

  $('#pf-form').addEventListener('submit', async e => {
    e.preventDefault();
    if(!checkFilled(e.target, 'pf-errors')) return;
    const email = $('#pf-email').value.trim().toLowerCase();
    const cambios = {nombre:$('#pf-nombre').value.trim(), apellido:$('#pf-apellido').value.trim(), telefono:$('#pf-tel').value.trim(), correo:email};
    if(email !== u.email) cambios.claveActual = $('#pf-pass').value;
    let datos;
    try{ datos = await api('PATCH', '/api/yo', cambios); }
    catch(err){
      if(err.estado !== 400 && err.estado !== 409) return toast(err.message, {type:'error'});
      return marcarError(/contraseña/i.test(err.message) ? 'pf-pass' : /correo/i.test(err.message) ? 'pf-email' : /celular/i.test(err.message) ? 'pf-tel' : /apellido/i.test(err.message) ? 'pf-apellido' : 'pf-nombre', err.message);
    }
    if(datos.correo !== u.email){
      /* Los pedidos guardados en esta pestaña pasan al correo nuevo */
      state.orders.forEach(o => { if(o.email===u.email) o.email = datos.correo; if(o.cuenta===u.email) o.cuenta = datos.correo; });
      state.user = datos.correo;
    }
    Object.assign(u, {nombre:datos.nombre, apellido:datos.apellido, email:datos.correo, tel:datos.telefono, nac:$('#pf-nac').value});
    save(); renderAccountMenu(); renderAccUser(); pedirPass();
    toast('Cambios guardados en tu perfil.');
  });

  $('#pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    if(!checkFilled(e.target, 'pw-errors')) return;
    try{ await api('PUT', '/api/yo/clave', {actual:$('#pw-actual').value, nueva:$('#pw-nueva').value}); }
    catch(err){
      if(err.estado !== 400) return toast(err.message, {type:'error'});
      return marcarError(/actual/i.test(err.message) ? 'pw-actual' : 'pw-nueva', err.message);
    }
    e.target.reset();
    toast('Contraseña actualizada.');
  });
}
