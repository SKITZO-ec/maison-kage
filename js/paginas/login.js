/* MAISON KAGE · Iniciar sesión
   Prototipo: cualquier correo y contraseña sirven, solo deben estar llenos */
const nextPage = safeNext(params.get('next'));
if(params.get('next')) $('#lg-reg').href = 'registro.html?next=' + encodeURIComponent(nextPage);

$('#lg-form').addEventListener('submit', e => {
  e.preventDefault();
  if(!checkFilled(e.target, 'lg-errors')) return;
  const email = $('#lg-email').value.trim().toLowerCase();
  if(!state.accounts[email]) state.accounts[email] = newAccount(nameFromEmail(email), '', email);
  state.user = email; save();
  flash(`Sesión iniciada. Hola, ${state.accounts[email].nombre}.`);
  location.href = nextPage;
});
