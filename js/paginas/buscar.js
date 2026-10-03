/* MAISON KAGE · Resultados de búsqueda (buscar.html?q=texto) */
function searchProducts(q){
  const terms = norm(q).split(/\s+/).filter(Boolean);
  return PRODUCTS.filter(p => {
    const hay = norm([p.nombre, p.marca, TIPOS[p.tipo], PUBLICOS[p.publico], COLS[p.col], ...p.notas.flat(), ...p.acordes.map(a=>a[0]), ...p.ocasion, p.tipo==='arabe'?'arabe arabes':'disenador'].join(' '));
    return terms.every(t => hay.includes(t));
  });
}

const q = (params.get('q') || '').trim();
$('#q').value = q;
const res = q ? searchProducts(q) : [];
const sugg = ['vainilla','oud','Lattafa','fresco','oficina'].map(s => `<a class="${TW.chipLight}" href="buscar.html?q=${encodeURIComponent(s)}">${s}</a>`).join('');
let body;
if(!q){
  body = `<div class="${TW.empty}"><div class="${TW.emptyIcon}">${ICON.search}</div><h2 class="${TW.emptyTitle}">¿Qué perfume buscas?</h2><p class="${TW.emptyP}">Escribe en el buscador el nombre de un perfume, una marca o una nota que te guste.</p><div class="${TW.suggest}">${sugg}</div></div>`;
} else if(!res.length){
  const li = TW.emptyLi;
  body = `<div class="${TW.empty}" role="status">
    <div class="${TW.emptyIcon}">${ICON.search}</div>
    <h2 class="${TW.emptyTitle}">Sin resultados</h2>
    <p class="${TW.emptyP}">No encontramos perfumes para <strong>“${esc(q)}”</strong>. Esto puede ayudarte.</p>
    <ul class="${TW.emptyList}"><li class="${li}">Revisa que el nombre esté bien escrito</li><li class="${li}">Busca por una nota como vainilla u oud</li><li class="${li}">Usa una sola palabra, por ejemplo la marca</li></ul>
    <p class="${TW.emptyP}"><strong>Búsquedas populares</strong></p><div class="${TW.suggest}">${sugg}</div>
    <div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Explorar el catálogo</a></div>
  </div>`;
} else {
  body = `<div class="${TW.toolbar}"><p class="${TW.count}" role="status">${res.length} ${res.length===1?'resultado':'resultados'} para “${esc(q)}”</p><a href="catalogo.html" class="${TW.linkSmall}">Refinar con filtros en el catálogo</a></div><div class="${TW.grid}">${res.map(card).join('')}</div>`;
}
$('#search-body').innerHTML = body;
