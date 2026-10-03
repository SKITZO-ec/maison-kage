/* MAISON KAGE · Crear cuenta */
const nextRaw = params.get('next') || '';
const nextPage = /^[a-z0-9-]+\.html$/.test(nextRaw) ? nextRaw : 'perfil.html';
if(params.get('email')) $('#rg-email').value = params.get('email');

$('#rg-form').addEventListener('submit', e => {
  e.preventDefault();
  if(!checkFilled(e.target, 'rg-errors')) return;
  const [nombre, ...ap] = $('#rg-nombre').value.trim().split(/\s+/);
  const email = $('#rg-email').value.trim().toLowerCase();
  const prev = state.accounts[email];
  state.accounts[email] = Object.assign(prev || newAccount('', '', email), {nombre, apellido:ap.join(' ')});
  state.user = email; save();
  flash('Cuenta creada. Bienvenido a Maison Kage.');
  location.href = nextPage;
});
