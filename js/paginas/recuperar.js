/* MAISON KAGE · Recuperar contraseña
   Sin código en la dirección se pide el enlace por correo. Con recuperar.html?codigo=...
   se muestra el formulario de la contraseña nueva */
const codigo = params.get('codigo');
const pedirOtro = `<a class="${TW.btnText} inline-block mt-[14px]" href="recuperar.html">Pedir un enlace nuevo</a>`;

/* ---------- Pedir el enlace ---------- */
function pedirEnlace(){
  $('#rc-form').addEventListener('submit', e => {
    e.preventDefault();
    const boton = e.target.querySelector('[type=submit]');
    if(boton.getAttribute('aria-disabled')==='true' || !checkFilled(e.target, 'rc-errors')) return;
    conBoton(boton, 'Enviando…', async () => {
      const correo = $('#rc-email').value.trim().toLowerCase();
      try{ await api('POST', '/api/recuperar', {correo}); }
      catch(err){ return toast(err.message, {type:'error'}); }
      $('#rc-body').innerHTML = `<div class="${TW.okBox}" role="status" tabindex="-1" id="rc-ok"><strong>Revisa tu correo</strong><p>Si el correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. El enlace vence en 30 minutos. Revisa también la carpeta de spam.</p></div>
        <a class="${TW.btnText} inline-block mt-[14px]" href="recuperar.html">Usar otro correo</a>`;
      $('#rc-ok').focus();
    });
  });
}

/* ---------- Clave nueva ---------- */
/* Campo de contraseña con el botón Mostrar, igual que en el login y el perfil */
function campoClave(id, label, help){
  return field({id, label, type:'password', auto:'new-password', help, attrs:'data-rule="pass"'})
    .replace(/(<input[^>]*>)/, `<div class="flex">$1<button class="${TW.passBtn}" type="button" data-action="toggle-pass" data-target="${id}" aria-pressed="false" aria-label="Mostrar contraseña">Mostrar</button></div>`);
}
function pedirClaveNueva(){
  $('#rc-intro').textContent = 'Escribe la contraseña nueva de tu cuenta.';
  $('#rc-titulo').textContent = 'Contraseña nueva';
  $('#rc-body').innerHTML = `<form id="rc-form" novalidate>
      <div class="${TW.errSummary}" id="rc-errors" tabindex="-1" role="alert" hidden></div>
      ${campoClave('rc-nueva', 'Contraseña nueva', 'Mínimo 8 caracteres')}
      ${campoClave('rc-repetir', 'Repite la contraseña nueva', '')}
      <button type="submit" class="${TW.btnGold} w-full">Cambiar contraseña</button>
    </form>`;
  $('#rc-form').addEventListener('submit', e => {
    e.preventDefault();
    const boton = e.target.querySelector('[type=submit]');
    if(boton.getAttribute('aria-disabled')==='true' || !checkFilled(e.target, 'rc-errors')) return;
    /* Las dos claves deben ser iguales, sin llamar a la API si no lo son */
    if($('#rc-nueva').value !== $('#rc-repetir').value) return marcarError('rc-repetir', 'Las contraseñas no coinciden.');
    conBoton(boton, 'Guardando…', async () => {
      try{ await api('POST', '/api/recuperar/' + encodeURIComponent(codigo), {clave:$('#rc-nueva').value}); }
      catch(err){
        if(err.estado !== 400) return toast(err.message, {type:'error'});
        $('#rc-body').innerHTML = `<div class="${TW.errSummary}" role="alert" tabindex="-1" id="rc-fallo"><p>${esc(err.message)}</p></div>${pedirOtro}`;
        return $('#rc-fallo').focus();
      }
      $('#rc-body').innerHTML = `<div class="${TW.okBox}" role="status" tabindex="-1" id="rc-ok"><strong>Tu contraseña se cambió. Ya puedes iniciar sesión.</strong></div>
        <a class="${TW.btnGold} w-full mt-[14px]" href="login.html">Iniciar sesión</a>`;
      $('#rc-ok').focus();
    });
  });
}

codigo ? pedirClaveNueva() : pedirEnlace();
