/* MAISON KAGE · Mi perfil */
if(requireLogin()){
  const u = currentUser();
  $('#pf-nombre').value = u.nombre;
  $('#pf-apellido').value = u.apellido;
  $('#pf-email').value = u.email;
  $('#pf-tel').value = u.tel;
  $('#pf-nac').value = u.nac;

  $('#pf-form').addEventListener('submit', e => {
    e.preventDefault();
    if(!checkFilled(e.target, 'pf-errors')) return;
    const email = $('#pf-email').value.trim().toLowerCase();
    if(email !== u.email){
      /* Cambio de correo: la cuenta y sus pedidos pasan al correo nuevo */
      delete state.accounts[u.email];
      state.orders.forEach(o => { if(o.email===u.email) o.email = email; });
      state.accounts[email] = u; state.user = email;
    }
    Object.assign(u, {nombre:$('#pf-nombre').value.trim(), apellido:$('#pf-apellido').value.trim(), email, tel:$('#pf-tel').value.trim(), nac:$('#pf-nac').value});
    save(); renderAccountMenu(); renderAccUser();
    toast('Cambios guardados en tu perfil.');
  });
}
