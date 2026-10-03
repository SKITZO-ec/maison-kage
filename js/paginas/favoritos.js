/* MAISON KAGE · Favoritos */
function renderFavs(){
  const favs = PRODUCTS.filter(p => isFav(p.id));
  $('#favs').innerHTML = favs.length
    ? `<p class="${TW.pageIntro}">${favs.length} ${favs.length===1?'perfume guardado':'perfumes guardados'}. Quita uno con el corazón.</p><div class="${TW.grid3}">${favs.map(card).join('')}</div>`
    : `<div class="${TW.empty}"><div class="${TW.emptyIcon}">${ICON.heartLine}</div><h2 class="${TW.emptyTitle}">Aún no tienes favoritos</h2><p class="${TW.emptyP}">Toca el corazón en cualquier perfume para guardarlo aquí y encontrarlo rápido.</p><div class="${TW.emptyBtns}"><a class="${TW.btnGold}" href="catalogo.html">Explorar el catálogo</a></div></div>`;
}
if(requireLogin()){
  renderFavs();
  document.addEventListener('mk:favs', () => { renderFavs(); $('#acc-content h1').focus(); });
}
