/* MAISON KAGE · Crear cuenta
   La cuenta se crea en el servidor y queda con la sesión iniciada */
if(!CATALOGO_CAIDO){
const nextPage = safeNext(params.get('next'));
if(params.get('next')) $('#rg-login').href = '/login.html?next=' + encodeURIComponent(nextPage);
if(params.get('email')) $('#rg-email').value = params.get('email');

/* Campo donde se muestra cada error que puede devolver el servidor */
const campoDelError = msg => /correo/i.test(msg) ? 'rg-email' : /celular/i.test(msg) ? 'rg-tel' : /contraseña/i.test(msg) ? 'rg-pass' : 'rg-nombre';

let creando = false;
$('#rg-form').addEventListener('submit', async e => {
  e.preventDefault();
  if(creando || !checkFilled(e.target, 'rg-errors')) return;
  const [nombre, ...ap] = $('#rg-nombre').value.trim().split(/\s+/);
  creando = true;
  try{
    await api('POST', '/api/registro', {nombre, apellido:ap.join(' '), correo:$('#rg-email').value.trim().toLowerCase(),
      telefono:$('#rg-tel').value.trim(), clave:$('#rg-pass').value});
    /* El carrito sin sesión pasa a la cuenta nueva antes de salir de la página */
    const fallo = await pasarCarritoALaCuenta();
    flash(fallo || 'Cuenta creada. Bienvenido a Maison Kage.', fallo ? {type:'error'} : {});
    location.href = '/' + nextPage;
  }catch(err){
    creando = false;
    /* Los datos rechazados se marcan en su campo, la falta de conexión o los demasiados intentos van en un aviso */
    [400, 409].includes(err.estado) ? marcarError(campoDelError(err.message), err.message) : toast(err.message, {type:'error'});
  }
});
}
