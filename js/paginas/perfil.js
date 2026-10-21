/* MAISON KAGE · Mi perfil
   Datos personales y cambio de contraseña. Cambiar el correo pide la contraseña actual.
   El servidor revisa las contraseñas y guarda los cambios, después la página vuelve a pedir
   los datos para mostrar lo que quedó guardado */
if(requireLogin()){
  const u = currentUser();
  const pintar = () => {
    $('#pf-nombre').value = u.nombre;
    $('#pf-apellido').value = u.apellido;
    $('#pf-email').value = u.email;
    $('#pf-tel').value = u.tel;
  };
  pintar();

  /* La contraseña actual solo aparece cuando el correo cambia */
  const pedirPass = () => {
    const cambia = $('#pf-email').value.trim().toLowerCase() !== u.email;
    $('#pf-pass-box').hidden = !cambia;
    cambia ? $('#pf-pass').setAttribute('aria-required','true') : ($('#pf-pass').removeAttribute('aria-required'), $('#pf-pass').value = '');
  };
  $('#pf-email').addEventListener('input', pedirPass);

  $('#pf-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target, boton = form.querySelector('[type=submit]');
    if(boton.getAttribute('aria-disabled')==='true' || !checkFilled(form, 'pf-errors')) return;
    conBoton(boton, 'Guardando…', async () => {
      const email = $('#pf-email').value.trim().toLowerCase();
      const cambios = {nombre:$('#pf-nombre').value.trim(), apellido:$('#pf-apellido').value.trim(), telefono:$('#pf-tel').value.trim(), correo:email};
      if(email !== u.email) cambios.claveActual = $('#pf-pass').value;
      let datos;
      try{ datos = await api('PATCH', '/api/yo', cambios); }
      catch(err){
        if(err.estado !== 400 && err.estado !== 409) return toast(err.message, {type:'error'});
        return marcarError(/contraseña/i.test(err.message) ? 'pf-pass' : /correo/i.test(err.message) ? 'pf-email' : /celular/i.test(err.message) ? 'pf-tel' : /apellido/i.test(err.message) ? 'pf-apellido' : 'pf-nombre', err.message);
      }
      /* Se vuelve a pedir la cuenta. Si esa lectura falla, sirve lo que contestó el guardado */
      try{ datos = await api('GET', '/api/yo') || datos; }catch(err){}
      if(datos.correo !== u.email) state.user = datos.correo;
      Object.assign(u, {nombre:datos.nombre, apellido:datos.apellido, email:datos.correo, tel:datos.telefono});
      save(); pintar(); renderAccountMenu(); renderAccUser(); pedirPass();
      toast('Cambios guardados en tu perfil.');
    });
  });

  $('#pw-form').addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target, boton = form.querySelector('[type=submit]');
    if(boton.getAttribute('aria-disabled')==='true' || !checkFilled(form, 'pw-errors')) return;
    conBoton(boton, 'Guardando…', async () => {
      try{ await api('PUT', '/api/yo/clave', {actual:$('#pw-actual').value, nueva:$('#pw-nueva').value}); }
      catch(err){
        if(err.estado !== 400) return toast(err.message, {type:'error'});
        return marcarError(/actual/i.test(err.message) ? 'pw-actual' : 'pw-nueva', err.message);
      }
      form.reset();
      toast('Contraseña actualizada.');
    });
  });
}
