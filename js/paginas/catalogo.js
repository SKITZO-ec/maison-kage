/* MAISON KAGE · Catálogo con filtros y orden
   Los enlaces del menú llegan con parámetros, por ejemplo catalogo.html?publico=hombre */
const emptyFilters = () => ({tipo:[], publico:[], col:[], ocasion:[], precio:'', oferta:false});
let filters = emptyFilters(), sortBy = 'relevancia';

['tipo','publico','col','ocasion'].forEach(k => { if(params.get(k)) filters[k] = [params.get(k)]; });
if(params.get('oferta')) filters.oferta = true;

function catContext(){
  const q = params;
  if(q.get('publico') && PUBLICOS[q.get('publico')]) return {title:'Perfumes para '+PUBLICOS[q.get('publico')].toLowerCase(), crumb:PUBLICOS[q.get('publico')], desc:'Fragancias seleccionadas para este público. Ajusta los filtros para afinar tu búsqueda.'};
  if(q.get('tipo')) return {title:q.get('tipo')==='arabe'?'Perfumes árabes':'Perfumes de diseñador', crumb:q.get('tipo')==='arabe'?'Árabes':'Diseñador', desc:q.get('tipo')==='arabe'?'Casas de Emiratos y Arabia Saudita con oud, ámbar y acordes dulces de gran duración.':'Las fragancias más reconocidas de las casas europeas de lujo.'};
  if(q.get('col') && COLS[q.get('col')]) return {title:COLS[q.get('col')], crumb:COLS[q.get('col')], desc:'Una colección curada por Maison Kage para una misma sensación.'};
  if(q.get('ocasion') && OCASIONES.includes(q.get('ocasion'))){ const o = {'Día':'el día','Noche':'la noche','Oficina':'la oficina','Citas':'citas','Fiesta':'fiestas','Verano':'el verano','Invierno':'el invierno'}[q.get('ocasion')]; return {title:'Perfumes para '+o, crumb:q.get('ocasion'), desc:'Fragancias que recomendamos para '+o+'. Puedes sumar otros filtros para afinar tu búsqueda.'}; }
  if(q.get('oferta')) return {title:'Ofertas', crumb:'Ofertas', desc:'Descuentos de la semana en frasco completo. Los precios de decant no cambian.'};
  if(q.get('decant')) return {title:'Decants', crumb:'Decants', desc:'Todos los perfumes del catálogo están disponibles en decant de 2, 5 y 10 ml. Elige el perfume y luego el tamaño en su ficha.'};
  return {title:'Catálogo', crumb:null, desc:'Todos nuestros perfumes en frasco y decant.'};
}
const countFor = (k,v) => PRODUCTS.filter(p => k==='ocasion' ? p.ocasion.includes(v) : p[k]===v).length;
function applyFilters(list, f){
  return list.filter(p =>
    (!f.tipo.length || f.tipo.includes(p.tipo)) &&
    (!f.publico.length || f.publico.includes(p.publico)) &&
    (!f.col.length || f.col.includes(p.col)) &&
    (!f.ocasion.length || f.ocasion.some(o => p.ocasion.includes(o))) &&
    (!f.oferta || p.oferta>0) &&
    (!f.precio || (()=>{ const v=finalPrice(p,50); return f.precio==='0-40'?v<=40 : f.precio==='40-80'?v>40&&v<=80 : v>80; })())
  );
}
function sortList(list, s){
  const l = [...list];
  if(s==='precio-asc') l.sort((a,b)=>cardPrice(a)-cardPrice(b));
  if(s==='precio-desc') l.sort((a,b)=>cardPrice(b)-cardPrice(a));
  if(s==='nombre') l.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  if(s==='tendencia') l.sort((a,b)=>(b.tend?1:0)-(a.tend?1:0));
  return l;
}
const LABELS = {tipo:TIPOS, publico:PUBLICOS, col:COLS, precio:{'0-40':'Hasta $40','40-80':'$40 a $80','80+':'Más de $80'}};

const MODO = params.get('decant') ? 'decant' : '';
const cardPrice = p => MODO==='decant' ? p.dec[0] : finalPrice(p,50);
function filtersHTML(){
  const f = filters;
  const grp = (legend, k, opts) => `<fieldset class="${TW.fieldset}"><legend class="${TW.legend}">${legend}</legend>${opts.map(([v,l]) =>
    `<label class="${TW.check}"><input class="${TW.checkInput}" type="checkbox" name="${k}" value="${v}" ${f[k].includes(v)?'checked':''}><span>${l}</span><span class="${TW.checkN}" aria-hidden="true">${countFor(k,v)}</span></label>`).join('')}</fieldset>`;
  return `<div class="${TW.filtersHead}"><h2 class="${TW.filtersTitle}">Filtros</h2><button type="button" class="${TW.btnText}" data-action="clear-filters" id="cat-clear">Limpiar filtros</button></div>
    ${grp('Tipo','tipo',Object.entries(TIPOS))}
    ${grp('Público','publico',Object.entries(PUBLICOS))}
    ${grp('Colección','col',Object.entries(COLS))}
    ${grp('Ocasión de uso','ocasion',OCASIONES.map(o=>[o,o]))}
    ${MODO==='decant' ? '' : `<fieldset class="${TW.fieldset}"><legend class="${TW.legend}">Precio del frasco 50 ml</legend>
      ${[['','Todos'],['0-40','Hasta $40'],['40-80','$40 a $80'],['80+','Más de $80']].map(([v,l]) =>
        `<label class="${TW.check}"><input class="${TW.checkInput}" type="radio" name="precio" value="${v}" ${f.precio===v?'checked':''}><span>${l}</span></label>`).join('')}
    </fieldset>
    <fieldset class="${TW.fieldset}"><legend class="${TW.legend}">Promociones</legend>
      <label class="${TW.check}"><input class="${TW.checkInput}" type="checkbox" name="oferta" value="1" ${f.oferta?'checked':''}><span>Solo ofertas</span></label>
    </fieldset>`}`;
}

const ctx = catContext();
document.title = ctx.title + ' | Maison Kage';
$('#app').innerHTML = `
  <nav aria-label="Migas de pan"><ol class="${TW.crumbs}"><li class="${TW.crumb}"><a class="underline" href="index.html">Inicio</a></li>${ctx.crumb?`<li class="${TW.crumb}"><a class="underline" href="catalogo.html">Catálogo</a></li><li class="${TW.crumb}" aria-current="page">${esc(ctx.crumb)}</li>`:`<li class="${TW.crumb}" aria-current="page">Catálogo</li>`}</ol></nav>
  <header class="${TW.pageHead}"><h1 class="${TW.pageTitle}">${esc(ctx.title)}</h1><p class="${TW.pageHeadP}">${ctx.desc}</p></header>
  <div class="${TW.catalog}">
    <button type="button" class="${TW.fToggle}" id="f-toggle" aria-expanded="false" aria-controls="cat-filters">Mostrar filtros</button>
    <aside class="${TW.filters}" id="cat-filters" aria-label="Filtros del catálogo">${filtersHTML()}</aside>
    <div>
      <div class="${TW.toolbar}">
        <p class="${TW.count}" id="cat-count" tabindex="-1" aria-live="polite"></p>
        <div class="${TW.sort}"><label for="cat-sort">Ordenar por</label>
          <select class="${TW.select}" id="cat-sort">
            <option value="relevancia">Relevancia</option><option value="tendencia">Tendencia</option>
            <option value="precio-asc">Precio, de menor a mayor</option><option value="precio-desc">Precio, de mayor a menor</option>
            <option value="nombre">Nombre, de la A a la Z</option>
          </select></div>
      </div>
      <div class="${TW.chips}" id="cat-chips" aria-label="Filtros activos"></div>
      <div id="cat-grid"></div>
    </div>
  </div>`;

function readFilters(){
  const f = emptyFilters();
  ['tipo','publico','col','ocasion'].forEach(k => f[k] = $$(`#cat-filters input[name=${k}]:checked`).map(i=>i.value));
  f.precio = $('#cat-filters input[name=precio]:checked')?.value || '';
  f.oferta = !!$('#cat-filters input[name=oferta]:checked');
  filters = f;
}
function renderResults(){
  const f = filters;
  const list = sortList(applyFilters(PRODUCTS, f), sortBy);
  $('#cat-count').textContent = `${list.length} ${list.length===1?'perfume':'perfumes'} de ${PRODUCTS.length}`;
  const chips = [];
  ['tipo','publico','col','ocasion'].forEach(k => f[k].forEach(v => chips.push([k,v,(LABELS[k]||{})[v]||v])));
  if(f.precio) chips.push(['precio',f.precio,LABELS.precio[f.precio]]);
  if(f.oferta) chips.push(['oferta','1','Solo ofertas']);
  $('#cat-chips').innerHTML = chips.map(([k,v,l]) => `<button type="button" class="${TW.chip}" data-action="rm-filter" data-k="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(l)}">${esc(l)} <span aria-hidden="true">×</span></button>`).join('');
  $('#cat-clear').disabled = !chips.length;
  $('#f-toggle').textContent = (($('#f-toggle').getAttribute('aria-expanded')==='true') ? 'Ocultar filtros' : 'Mostrar filtros') + (chips.length ? ` (${chips.length})` : '');
  $('#cat-grid').innerHTML = list.length ? `<div class="${TW.grid3}">${list.map(x => card(x, MODO)).join('')}</div>` : `
    <div class="${TW.empty}" role="status">
      <div class="${TW.emptyIcon}">${ICON.search}</div>
      <h2 class="${TW.emptyTitle}">Ningún perfume coincide</h2>
      <p class="${TW.emptyP}">La combinación de filtros que elegiste no tiene resultados. Quita alguno de los filtros activos o límpialos todos para volver a ver el catálogo completo.</p>
      <div class="${TW.emptyBtns}"><button type="button" class="${TW.btnGold}" data-action="clear-filters">Limpiar filtros</button></div>
    </div>`;
}

$('#cat-filters').addEventListener('change', () => { readFilters(); renderResults(); });
$('#cat-sort').addEventListener('change', e => { sortBy = e.target.value; renderResults(); });
$('#f-toggle').addEventListener('click', e => {
  const open = e.currentTarget.getAttribute('aria-expanded')!=='true';
  e.currentTarget.setAttribute('aria-expanded', open);
  $('#cat-filters').classList.toggle('tablet:hidden', !open);
  renderResults();
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if(!t) return;
  if(t.dataset.action==='clear-filters'){
    filters = emptyFilters();
    $$('#cat-filters input').forEach(i => i.checked = i.name==='precio' && i.value==='');
    renderResults(); $('#cat-count').focus();
  }
  if(t.dataset.action==='rm-filter'){
    const {k, v} = t.dataset, f = filters;
    if(k==='precio') f.precio = ''; else if(k==='oferta') f.oferta = false; else f[k] = f[k].filter(x => x!==v);
    $$('#cat-filters input').forEach(i => {
      if(i.name===k && (k==='precio' ? i.value===v : k==='oferta' || i.value===v)) i.checked = false;
      if(k==='precio' && i.name==='precio' && i.value==='') i.checked = true;
    });
    renderResults(); $('#cat-count').focus();
  }
});
renderResults();
