/* MAISON KAGE · Iniciar sesión
   Prototipo. Si el correo no tiene cuenta se crea con esa contraseña.
   Si ya existe, la contraseña debe coincidir */
const nextPage = safeNext(params.get('next'));
if(params.get('next')) $('#lg-reg').href = 'registro.html?next=' + encodeURIComponent(nextPage);

$('#lg-form').addEventListener('submit', async e => {
  e.preventDefault();
  if(!checkFilled(e.target, 'lg-errors')) return;
  const email = $('#lg-email').value.trim().toLowerCase(), pass = $('#lg-pass').value;
  const u = state.accounts[email];
  /* El mensaje no dice si falló el correo o la contraseña */
  if(u && !(await passOk(u, pass))) return marcarError('lg-pass', 'El correo o la contraseña no son correctos.');
  if(!u) state.accounts[email] = Object.assign(newAccount(nameFromEmail(email), '', email), {passHash: await hashPass(pass)});
  else if(!u.passHash) u.passHash = await hashPass(pass);
  state.user = email; save();
  flash(`Sesión iniciada. Hola, ${state.accounts[email].nombre}.`);
  location.href = nextPage;
});
