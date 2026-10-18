/* MAISON KAGE · Mi perfil
   Datos personales y cambio de contraseña. Cambiar el correo pide la contraseña actual */
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
    if(email !== u.email){
      if(state.accounts[email]) return marcarError('pf-email', 'Ya existe una cuenta con ese correo.');
      if(!(await passOk(u, $('#pf-pass').value))) return marcarError('pf-pass', 'La contraseña actual no es correcta.');
      /* La cuenta y sus pedidos pasan al correo nuevo */
      delete state.accounts[u.email];
      state.orders.forEach(o => { if(o.email===u.email) o.email = email; if(o.cuenta===u.email) o.cuenta = email; });
      state.accounts[email] = u; state.user = email;
    }
    Object.assign(u, {nombre:$('#pf-nombre').value.trim(), apellido:$('#pf-apellido').value.trim(), email, tel:$('#pf-tel').value.trim(), nac:$('#pf-nac').value});
    save(); renderAccountMenu(); renderAccUser(); pedirPass();
    toast('Cambios guardados en tu perfil.');
  });

  $('#pw-form').addEventListener('submit', async e => {
    e.preventDefault();
    if(!checkFilled(e.target, 'pw-errors')) return;
    if(!(await passOk(u, $('#pw-actual').value))) return marcarError('pw-actual', 'La contraseña actual no es correcta.');
    u.passHash = await hashPass($('#pw-nueva').value);
    save(); e.target.reset();
    toast('Contraseña actualizada.');
  });
}
