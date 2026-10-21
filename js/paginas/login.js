/* MAISON KAGE · Iniciar sesión
   El servidor revisa el correo y la contraseña. Si el correo no tiene cuenta
   se muestra el mismo mensaje que con la contraseña equivocada, así no se puede
   saber qué correos están registrados. Para crear una está el enlace de abajo */
const nextPage = safeNext(params.get('next'));
if(params.get('next')) $('#lg-reg').href = 'registro.html?next=' + encodeURIComponent(nextPage);

let entrando = false;
$('#lg-form').addEventListener('submit', async e => {
  e.preventDefault();
  if(entrando || !checkFilled(e.target, 'lg-errors')) return;
  entrando = true;
  try{
    const u = await api('POST', '/api/login', {correo:$('#lg-email').value.trim().toLowerCase(), clave:$('#lg-pass').value});
    /* El carrito sin sesión pasa a la cuenta antes de salir de la página */
    const fallo = await pasarCarritoALaCuenta();
    flash(fallo || `Sesión iniciada. Hola, ${u.nombre}.`, fallo ? {type:'error'} : {});
    /* Al cargar la página siguiente js/sesion.js ya trae la cuenta y su carrito */
    location.href = nextPage;
  }catch(err){
    entrando = false;
    /* Sin conexión o con demasiados intentos no tiene sentido marcar la contraseña */
    [400, 401].includes(err.estado) ? marcarError('lg-pass', err.message) : toast(err.message, {type:'error'});
  }
});
