/* MAISON KAGE · Crear cuenta */
const nextPage = safeNext(params.get('next'));
if(params.get('next')) $('#rg-login').href = 'login.html?next=' + encodeURIComponent(nextPage);
if(params.get('email')) $('#rg-email').value = params.get('email');

$('#rg-form').addEventListener('submit', async e => {
  e.preventDefault();
  if(!checkFilled(e.target, 'rg-errors')) return;
  const [nombre, ...ap] = $('#rg-nombre').value.trim().split(/\s+/);
  const email = $('#rg-email').value.trim().toLowerCase();
  const prev = state.accounts[email];
  if(prev && prev.passHash) return marcarError('rg-email', 'Ya existe una cuenta con este correo. Inicia sesión.');
  state.accounts[email] = Object.assign(prev || newAccount('', '', email),
    {nombre, apellido:ap.join(' '), tel:$('#rg-tel').value.trim(), passHash: await hashPass($('#rg-pass').value)});
  state.user = email; save();
  flash('Cuenta creada. Bienvenido a Maison Kage.');
  location.href = nextPage;
});
