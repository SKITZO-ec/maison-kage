/* MAISON KAGE · Perfumes con filtros y orden
   Los enlaces del menú llegan con parámetros, por ejemplo catalogo.html?familia=floral */
if(!CATALOGO_CAIDO){
const EJES = ['origen','publico','familia','ocasion','conc'];
const BANDERAS = {oferta:'Ofertas', novedad:'Novedades', top:'Más vendidos'};
const emptyFilters = () => ({origen:[], publico:[], familia:[], ocasion:[], conc:[], precio:'', oferta:false, novedad:false, top:false});
let filters = emptyFilters(), sortBy = 'relevancia';

EJES.forEach(k => { if(params.get(k)) filters[k] = [params.get(k)]; });
Object.keys(BANDERAS).forEach(k => { if(params.get(k)) filters[k] = true; });

const OCASION_TXT = {'Oficina':'la oficina','Diario':'el día a día','Citas':'citas','Noche':'la noche','Verano':'el verano','Eventos':'eventos'};
const LABELS = {origen:ORIGENES, publico:PUBLICOS, familia:FAMILIAS,
  ocasion:Object.fromEntries(OCASIONES.map(o=>[o,o])), conc:Object.fromEntries(CONCENTRACIONES.map(c=>[c,c])),
  precio:{'0-40':'Hasta $40','40-80':'$40 a $80','80+':'Más de $80'}};

/* Título, miga y descripción según cómo se llegó a la página */
function catContext(){
  const q = params;
  if(q.get('publico') && PUBLICOS[q.get('publico')]) return {title:'Perfumes para '+PUBLICOS[q.get('publico')].toLowerCase(), crumb:PUBLICOS[q.get('publico')], desc:'Fragancias seleccionadas para este público. Ajusta los filtros para afinar tu búsqueda.'};
  if(q.get('origen') && ORIGENES[q.get('origen')]) return {title:{arabe:'Perfumes árabes', disenador:'Perfumes de diseñador', nicho:'Perfumes de nicho'}[q.get('origen')], crumb:ORIGENES[q.get('origen')],
    desc:{arabe:'Casas de Emiratos y Arabia Saudita con oud, ámbar y acordes dulces de gran duración.', disenador:'Las fragancias más reconocidas de las casas europeas de lujo.', nicho:'Casas independientes con fórmulas de autor y materias primas poco comunes.'}[q.get('origen')]};
  if(q.get('familia') && FAMILIAS[q.get('familia')]) return {title:FAMILIAS[q.get('familia')], crumb:FAMILIAS[q.get('familia')], desc:'Perfumes de la familia olfativa '+FAMILIAS[q.get('familia')].toLowerCase()+'. Puedes sumar otros filtros para afinar tu búsqueda.'};
  if(q.get('ocasion') && OCASIONES.includes(q.get('ocasion'))){ const o = OCASION_TXT[q.get('ocasion')]; return {title:'Perfumes para '+o, crumb:q.get('ocasion'), desc:'Fragancias que recomendamos para '+o+'. Puedes sumar otros filtros para afinar tu búsqueda.'}; }
  if(q.get('conc') && CONCENTRACIONES.includes(q.get('conc'))) return {title:q.get('conc'), crumb:q.get('conc'), desc:'Perfumes con concentración '+q.get('conc')+'.'};
  if(q.get('oferta')) return {title:'Ofertas', crumb:'Ofertas', desc:'Descuentos de la semana en frasco completo. Los precios de decant no cambian.'};
  if(q.get('novedad')) return {title:'Novedades', crumb:'Novedades', desc:'Los perfumes que acaban de llegar a Maison Kage.'};
  if(q.get('top')) return {title:'Más vendidos', crumb:'Más vendidos', desc:'Los perfumes que más eligen nuestros clientes.'};
  if(q.get('decant')) return {title:'Decants', crumb:'Decants', desc:'Perfumes disponibles en decant de 2, 5 y 10 ml. Toca un tamaño para agregarlo a tu carrito o abre el decant para ver su detalle.'};
  return {title:'Todos los perfumes', crumb:null, desc:'Todos nuestros perfumes en frasco y decant.'};
}

const MODO = params.get('decant') ? 'decant' : '';
/* En el apartado de decants solo aparecen los perfumes que tienen decant */
const BASE = MODO==='decant' ? PRODUCTS.filter(p => decants(p).length) : PRODUCTS;
const cardPrice = p => MODO==='decant' ? decants(p)[0].precio : precioDesde(p);
const tiene = (p, k, v) => k==='ocasion' ? p.ocasion.includes(v) : p[k]===v;
const countFor = (k,v) => BASE.filter(p => tiene(p,k,v)).length;

function applyFilters(list, f){
  return list.filter(p =>
    EJES.every(k => !f[k].length || f[k].some(v => tiene(p,k,v))) &&
    Object.keys(BANDERAS).every(k => !f[k] || (k==='oferta' ? p.oferta>0 : p[k])) &&
    (!f.precio || (()=>{ const v = precioDesde(p); return f.precio==='0-40'?v<=40 : f.precio==='40-80'?v>40&&v<=80 : v>80; })())
  );
}
function sortList(list, s){
  const l = [...list];
  if(s==='precio-asc') l.sort((a,b)=>cardPrice(a)-cardPrice(b));
  if(s==='precio-desc') l.sort((a,b)=>cardPrice(b)-cardPrice(a));
  if(s==='nombre') l.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  if(s==='top') l.sort((a,b)=>(b.top?1:0)-(a.top?1:0));
  return l;
}

function filtersHTML(){
  const f = filters;
  const grp = (legend, k, opts) => `<fieldset class="${TW.fieldset}"><legend class="${TW.legend}">${legend}</legend>${opts.map(([v,l]) =>
    `<label class="${TW.check}"><input class="${TW.checkInput}" type="checkbox" name="${k}" value="${esc(v)}" ${f[k].includes(v)?'checked':''}><span>${l}</span><span class="${TW.checkN}" aria-hidden="true">${countFor(k,v)}</span></label>`).join('')}</fieldset>`;
  return `<div class="${TW.filtersHead}"><h2 class="${TW.filtersTitle}">Filtros</h2><button type="button" class="${TW.btnText}" data-action="clear-filters" id="cat-clear">Limpiar filtros</button></div>
    ${grp('Público','publico',Object.entries(PUBLICOS))}
    ${grp('Origen','origen',Object.entries(ORIGENES))}
    ${grp('Familia olfativa','familia',Object.entries(FAMILIAS))}
    ${grp('Ocasión de uso','ocasion',OCASIONES.map(o=>[o,o]))}
    ${grp('Concentración','conc',CONCENTRACIONES.map(c=>[c,c]))}
    ${MODO==='decant' ? '' : `<fieldset class="${TW.fieldset}"><legend class="${TW.legend}">Precio desde</legend>
      ${[['','Todos'],['0-40','Hasta $40'],['40-80','$40 a $80'],['80+','Más de $80']].map(([v,l]) =>
        `<label class="${TW.check}"><input class="${TW.checkInput}" type="radio" name="precio" value="${v}" ${f.precio===v?'checked':''}><span>${l}</span></label>`).join('')}
    </fieldset>
    <fieldset class="${TW.fieldset}"><legend class="${TW.legend}">Destacados</legend>
      ${Object.entries(BANDERAS).map(([k,l]) => `<label class="${TW.check}"><input class="${TW.checkInput}" type="checkbox" name="${k}" value="1" ${f[k]?'checked':''}><span>${l}</span></label>`).join('')}
    </fieldset>`}`;
}

const ctx = catContext();
document.title = ctx.title + ' | Maison Kage';
$('#app').innerHTML = `
  <nav aria-label="Migas de pan"><ol class="${TW.crumbs}"><li class="${TW.crumb}"><a class="underline" href="/index.html">Inicio</a></li>${ctx.crumb?`<li class="${TW.crumb}"><a class="underline" href="/catalogo.html">Perfumes</a></li><li class="${TW.crumb}" aria-current="page">${esc(ctx.crumb)}</li>`:`<li class="${TW.crumb}" aria-current="page">Perfumes</li>`}</ol></nav>
  <header class="${TW.pageHead}"><h1 class="${TW.pageTitle}">${esc(ctx.title)}</h1><p class="${TW.pageHeadP}">${ctx.desc}</p></header>
  <div class="${TW.catalog}">
    <button type="button" class="${TW.fToggle}" id="f-toggle" aria-expanded="false" aria-controls="cat-filters">Mostrar filtros</button>
    <aside class="${TW.filters}" id="cat-filters" aria-label="Filtros de perfumes">${filtersHTML()}</aside>
    <div>
      <div class="${TW.toolbar}">
        <p class="${TW.count}" id="cat-count" tabindex="-1" aria-live="polite"></p>
        <div class="${TW.sort}"><label for="cat-sort">Ordenar por</label>
          <select class="${TW.select}" id="cat-sort">
            <option value="relevancia">Relevancia</option><option value="top">Más vendidos</option>
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
  EJES.forEach(k => f[k] = $$(`#cat-filters input[name=${k}]:checked`).map(i=>i.value));
  f.precio = $('#cat-filters input[name=precio]:checked')?.value || '';
  Object.keys(BANDERAS).forEach(k => f[k] = !!$(`#cat-filters input[name=${k}]:checked`));
  filters = f;
}
function renderResults(){
  const f = filters;
  const list = sortList(applyFilters(BASE, f), sortBy);
  $('#cat-count').textContent = `${list.length} ${list.length===1?'perfume':'perfumes'} de ${BASE.length}`;
  const chips = [];
  EJES.forEach(k => f[k].forEach(v => chips.push([k,v,LABELS[k][v]||v])));
  if(f.precio) chips.push(['precio',f.precio,LABELS.precio[f.precio]]);
  Object.entries(BANDERAS).forEach(([k,l]) => { if(f[k]) chips.push([k,'1',l]); });
  $('#cat-chips').innerHTML = chips.map(([k,v,l]) => `<button type="button" class="${TW.chip}" data-action="rm-filter" data-k="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(l)}">${esc(l)} <span aria-hidden="true">×</span></button>`).join('');
  $('#cat-clear').disabled = !chips.length;
  $('#f-toggle').textContent = (($('#f-toggle').getAttribute('aria-expanded')==='true') ? 'Ocultar filtros' : 'Mostrar filtros') + (chips.length ? ` (${chips.length})` : '');
  $('#cat-grid').innerHTML = list.length ? `<div class="${TW.grid3}">${list.map(x => card(x, MODO)).join('')}</div>` : `
    <div class="${TW.empty}" role="status">
      <div class="${TW.emptyIcon}">${ICON.search}</div>
      <h2 class="${TW.emptyTitle}">Ningún perfume coincide</h2>
      <p class="${TW.emptyP}">La combinación de filtros que elegiste no tiene resultados. Quita alguno de los filtros activos o límpialos todos para volver a ver todos los perfumes.</p>
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
    if(k==='precio') f.precio = ''; else if(BANDERAS[k]) f[k] = false; else f[k] = f[k].filter(x => x!==v);
    $$('#cat-filters input').forEach(i => {
      if(i.name===k && (k==='precio' ? i.value===v : BANDERAS[k] || i.value===v)) i.checked = false;
      if(k==='precio' && i.name==='precio' && i.value==='') i.checked = true;
    });
    renderResults(); $('#cat-count').focus();
  }
});
renderResults();
}
