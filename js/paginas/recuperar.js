/* MAISON KAGE · Recuperar contraseña */
$('#rc-form').addEventListener('submit', e => {
  e.preventDefault();
  if(!checkFilled(e.target, 'rc-errors')) return;
  const mail = esc($('#rc-email').value.trim());
  $('#rc-body').innerHTML = `<div class="${TW.okBox}" role="status" tabindex="-1" id="rc-ok"><strong>Revisa tu correo</strong><p>Si <strong>${mail}</strong> está registrado, te enviamos un enlace para crear una nueva contraseña. El enlace vence en 30 minutos. Revisa también la carpeta de spam.</p></div>
    <a class="${TW.btnText} inline-block mt-[14px]" href="recuperar.html">Usar otro correo</a>`;
  $('#rc-ok').focus();
});
