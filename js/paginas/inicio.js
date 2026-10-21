/* MAISON KAGE · Inicio con ofertas, novedades y más vendidos
   Un perfume no se repite entre secciones */
if(!CATALOGO_CAIDO){
const usados = new Set();
const tomar = filtro => { const l = PRODUCTS.filter(p => filtro(p) && !usados.has(p.id)).slice(0,4); l.forEach(p => usados.add(p.id)); return l; };

$('#home-ofertas').innerHTML = tomar(p => p.oferta>0).map(p => card(p)).join('');
$('#home-novedades').innerHTML = tomar(p => p.novedad).map(p => card(p)).join('');
$('#home-top').innerHTML = tomar(p => p.top).map(p => card(p)).join('');
$('#home-vistos').innerHTML = vistosHTML();
}
