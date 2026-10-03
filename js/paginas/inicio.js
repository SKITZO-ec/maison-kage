/* MAISON KAGE · Inicio: ofertas de la semana y perfumes en tendencia */
const offers = PRODUCTS.filter(p => p.oferta).slice(0,4);
const offerIds = new Set(offers.map(p => p.id));
const trends = PRODUCTS.filter(p => p.tend && !offerIds.has(p.id)).slice(0,4);

$('#home-ofertas').innerHTML = offers.map(card).join('');
$('#home-tend').innerHTML = trends.map(card).join('');
