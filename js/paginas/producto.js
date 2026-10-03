/* MAISON KAGE · Ficha de producto
   producto.html?id=khamrah                  ficha del frasco completo
   producto.html?id=khamrah&formato=decant   ficha del decant (apartado propio)
   Cada ficha tiene una sola decisión de tamaño. */
const p = byId(params.get('id'));
const ES_DECANT = params.get('formato') === 'decant';
const urlFrasco = id => `producto.html?id=${id}`;
const urlDecant = id => `producto.html?id=${id}&formato=decant`;
/* Texto natural para el enlace de cada ocasión de uso */
const OCASION_TXT = {'Día':'el día','Noche':'la noche','Oficina':'la oficina','Citas':'citas','Fiesta':'fiestas','Verano':'el verano','Invierno':'el invierno'};
/* Nombre accesible de cada foto, por ejemplo Frasco de frente de Khamrah de Lattafa */
const fotoLabel = v => v+' de '+p.nombre+' de '+p.marca;
let pd;
if(!p) location.replace('404.html');
else renderProduct();

function renderProduct(){
  pd = {ml: ES_DECANT ? 5 : 50, qty: 1};
  document.title = (ES_DECANT ? 'Decant de ' : '') + p.nombre + ' de ' + p.marca + ' | Maison Kage';
  const related = PRODUCTS.filter(x => x.id!==p.id && (x.col===p.col || x.publico===p.publico)).slice(0,4);
  const views = ES_DECANT ? ['Decant en atomizador','Decant junto al frasco original','Etiqueta y sello Maison Kage']
                          : ['Frasco de frente','Frasco de perfil','Caja original'];
  /* nombre del archivo de cada vista dentro de img/productos */
  const files = ES_DECANT ? ['decant-atomizador','decant','decant-etiqueta'] : ['frente','perfil','caja'];
  const cr = TW.crumb;
  /* Opción tipo radio: recuadro que se pinta de azul noche al elegirlo */
  const opt = (name, ml, on, price, extra) => `<label class="${TW.opt}"><input type="radio" name="${name}" value="${ml}" class="${TW.optInput}" ${on?'checked':''}><span class="${TW.optBox}"><strong class="${TW.optStrong}">${ml} ml</strong><small class="${TW.optSmall}">${price}</small>${extra?`<em class="${TW.optEm}">${extra}</em>`:''}</span></label>`;
  const sizes = ES_DECANT
    ? `<fieldset class="${TW.opts}"><legend class="${TW.optsLegend}">Tamaño</legend>${DEC_SIZES.map(ml=>opt('pd-ml', ml, ml===5, money(decPrice(p,ml)), DEC_SPRAYS[ml])).join('')}</fieldset>`
    : `<fieldset class="${TW.opts}"><legend class="${TW.optsLegend}">Tamaño</legend>${[50,100].map(ml=>opt('pd-ml', ml, ml===50, money(finalPrice(p,ml)))).join('')}</fieldset>`;
  const ocasiones = p.ocasion.map(o => `<li><a class="${TW.tagLink}" href="catalogo.html?ocasion=${encodeURIComponent(o)}" aria-label="Ver perfumes para ${OCASION_TXT[o]||o}">${o}</a></li>`).join('');

  $('#app').innerHTML = `
    <nav aria-label="Migas de pan"><ol class="${TW.crumbs}">
      <li class="${cr}"><a class="underline" href="index.html">Inicio</a></li>
      ${ES_DECANT
        ? `<li class="${cr}"><a class="underline" href="catalogo.html?decant=1">Decants</a></li>`
        : `<li class="${cr}"><a class="underline" href="catalogo.html">Perfumes</a></li><li class="${cr}"><a class="underline" href="catalogo.html?tipo=${p.tipo}">${p.tipo==='arabe'?'Árabes':'Diseñador'}</a></li>`}
      <li class="${cr}" aria-current="page">${esc(p.nombre)}</li></ol></nav>
    <div class="${TW.pd}">
      <div>
        <div id="pd-main">${foto(p, files[0], fotoLabel(views[0]))}</div>
        <p class="${TW.galleryCap}" id="pd-cap" aria-live="polite">${views[0]}</p>
        <div class="${TW.thumbs}" role="group" aria-label="Otras vistas del producto">
          ${views.map((v,i)=>`<button type="button" class="${TW.thumb}" data-action="thumb" data-view="${v}" data-foto="${files[i]}" aria-pressed="${i===0}" aria-label="Ver ${v.toLowerCase()}">${foto(p, files[i], '', 'ph', true)}</button>`).join('')}
        </div>
      </div>
      <div>
        <p class="${TW.eyebrow}">${esc(p.marca)} · ${ES_DECANT ? 'Decant' : 'Perfume '+TIPOS[p.tipo].toLowerCase()}</p>
        <h1 class="${TW.pdName}">${esc(p.nombre)}</h1>
        <p class="${TW.pdMeta}">${ES_DECANT ? `Decant de ${p.conc} · Atomizador de vidrio` : `${p.conc} · ${PUBLICOS[p.publico]} · Colección ${COLS[p.col]}`}</p>
        <div class="${TW.pdPrice}">
          <span class="${TW.priceLg}" id="pd-price"></span>
          ${!ES_DECANT && p.oferta ? `<s class="${TW.priceOld}" id="pd-old"></s><span class="${TW.sealInline}" aria-label="Oferta, ${p.oferta} por ciento de descuento">-${p.oferta}%</span>` : ''}
        </div>
        ${sizes}
        <div class="${TW.qtyRow}">
          <span class="${TW.label}" id="pd-qty-lbl">Cantidad</span>
          <div class="${TW.stepper}" role="group" aria-labelledby="pd-qty-lbl">
            <button class="${TW.stepperBtn}" type="button" data-action="pd-qty" data-d="-1" aria-label="Restar una unidad">−</button>
            <output class="${TW.stepperOut}" id="pd-qty" aria-live="polite">1</output>
            <button class="${TW.stepperBtn}" type="button" data-action="pd-qty" data-d="1" aria-label="Sumar una unidad">+</button>
          </div>
          <p class="${TW.stock}" id="pd-stock" aria-live="polite"></p>
        </div>
        <div class="${TW.pdActions}">
          <button type="button" class="${TW.pdBtnOutline}" data-action="pd-add" id="pd-add">Agregar al carrito</button>
          <button type="button" class="${TW.pdBtnGold}" data-action="pd-buy" id="pd-buy">Comprar ahora</button>
          ${favBtn(p, true)}
        </div>
        <div class="${TW.pdOcc}"><h2 class="${TW.miniTitle}">Ocasión de uso</h2><ul class="${TW.tags}">${ocasiones}</ul></div>
        <ul class="${TW.perks}">
          <li class="${TW.perk}">${ICON.truck} Envío ${money(SHIP)}, gratis desde ${money(FREE_SHIP)}, o retiro gratis en Quito</li>
          <li class="${TW.perk}">${ICON.shield} ${ES_DECANT ? 'Del mismo frasco original, envasado a mano' : 'Producto original con sello de cera Maison Kage'}</li>
          <li class="${TW.perk}">${ICON.check} Pago con tarjeta o con Deuna</li>
        </ul>
        ${ES_DECANT ? `<p class="${TW.crossLink}">¿Te gustó? <a class="underline font-semibold" href="${urlFrasco(p.id)}">Ver el frasco completo de ${esc(p.nombre)}</a></p>` : ''}
      </div>
    </div>

    <section class="${TW.tabsWrap}" aria-label="Información del perfume">
      <div class="${TW.tabList}" role="tablist">
        <button type="button" class="${TW.tab}" role="tab" id="tab-desc" aria-selected="true" aria-controls="panel-desc" data-action="tab">Descripción</button>
        <button type="button" class="${TW.tab}" role="tab" id="tab-uso" aria-selected="false" aria-controls="panel-uso" tabindex="-1" data-action="tab">Modo de uso</button>
      </div>
      <div class="${TW.tabPanel}" role="tabpanel" id="panel-desc" aria-labelledby="tab-desc" tabindex="0">
        <p>${DESC[p.id] || ''}</p>
      </div>
      <div class="${TW.tabPanel}" role="tabpanel" id="panel-uso" aria-labelledby="tab-uso" tabindex="0" hidden>
        <p>${USO_CONC[p.conc] || ''}</p>
        <ol class="${TW.usoList}">${USO_PASOS.map(x=>`<li>${x}</li>`).join('')}</ol>
        <p class="${TW.usoNote}">Si compras un decant, cada atomización equivale a una del frasco. El decant de 5 ml rinde ${DEC_SPRAYS[5].replace('≈','unas').replace('atomizaciones','aplicaciones')}, suficiente para probarlo varios días.</p>
      </div>
    </section>

    <div class="${TW.pdDetails}">
      <section aria-labelledby="h-notas">
        <h2 class="${TW.sectionTitle}" id="h-notas"><span>Notas olfativas</span></h2>
        <div class="${TW.pyramid}">
          ${[['Salida','Lo primero que sientes, dura unos 15 minutos.'],['Corazón','La personalidad del perfume, entre 2 y 4 horas.'],['Fondo','Lo que queda en la piel al final del día.']].map(([t,h],i)=>
            `<div class="${TW.pyr}"><h3 class="${TW.pyrTitle}">${t}</h3><div><p class="${TW.pyrText}">${p.notas[i].join(', ')}</p><p class="${TW.pyrHint}">${h}</p></div></div>`).join('')}
        </div>
      </section>
      <section aria-labelledby="h-acordes">
        <h2 class="${TW.sectionTitle}" id="h-acordes"><span>Acordes principales</span></h2>
        <ul class="${TW.accords}">${p.acordes.map(([n,v])=>`<li class="${TW.accord}"><span>${n}</span><span class="${TW.meter}" role="img" aria-label="${n}, intensidad ${v} de 100"><span class="${TW.meterFill} w-[${v}%]"></span></span></li>`).join('')}</ul>
      </section>
    </div>

    ${ES_DECANT ? '' : `
    <section class="${TW.decantBand}" aria-labelledby="h-dec">
      <div class="${TW.decGrid}">
        <div>
          <p class="${TW.eyebrowRule}">Prueba antes de comprar</p>
          <h2 class="${TW.decTitle}" id="h-dec">${esc(p.nombre)} en decant</h2>
          <p>El mismo perfume, envasado a mano en atomizador de vidrio con etiqueta Maison Kage. Úsalo varios días y decide sin pagar el frasco completo.</p>
          <ul class="${TW.decFacts}"><li class="${TW.decFact}">${ICON.check} Original, del mismo lote</li><li class="${TW.decFact}">${ICON.check} Atomizador de vidrio</li><li class="${TW.decFact}">${ICON.check} Hasta ${DEC_MAX} por tamaño</li></ul>
        </div>
        <div class="${TW.decAsk}">
          <h3 class="${TW.decAskTitle}">¿No estás seguro?</h3>
          <p>Pruébalo desde <strong>${money(p.dec[0])}</strong> antes de comprar el frasco. Hay decants de ${DEC_SIZES.join(', ').replace(/, (\d+)$/, ' y $1')} ml.</p>
          <a class="${TW.btnNavy} mt-4" href="${urlDecant(p.id)}">Ver el decant</a>
        </div>
      </div>
    </section>`}

    <section class="${TW.block}" aria-labelledby="h-rel">
      <h2 class="${TW.sectionTitle}" id="h-rel"><span>${ES_DECANT ? 'Otros decants que te pueden gustar' : 'También te puede gustar'}</span></h2>
      <div class="${TW.grid}">${related.map(x => card(x, ES_DECANT ? 'decant' : '')).join('')}</div>
    </section>`;
  $$('input[name=pd-ml]').forEach(i => i.addEventListener('change', e => { pd.ml = +e.target.value; pd.qty = 1; updatePD(); }));
  updatePD();
}

/* Cuántos decants de un tamaño ya están en el carrito (máximo DEC_MAX por tamaño) */
function decInCart(ml){ return state.cart.filter(l => l.id===p.id && l.kind==='decant' && l.ml===ml).reduce((a,l)=>a+l.qty,0); }

function updatePD(){
  const avail = ES_DECANT ? DEC_MAX - decInCart(pd.ml) : p.stock - frascoUsed(p.id);
  if(pd.qty > Math.max(avail,1)) pd.qty = Math.max(avail,1);
  $('#pd-price').textContent = `${money(ES_DECANT ? decPrice(p,pd.ml) : finalPrice(p,pd.ml))} · ${pd.ml} ml`;
  if(!ES_DECANT && p.oferta) $('#pd-old').innerHTML = `<span class="sr-only">Precio anterior </span>${money(basePrice(p,pd.ml))}`;
  $('#pd-qty').textContent = pd.qty;
  const [minus, plus] = $$('[data-action=pd-qty]');
  minus.disabled = pd.qty<=1; plus.disabled = pd.qty>=avail;
  const st = $('#pd-stock');
  if(ES_DECANT){
    st.className = avail<=0 ? TW.stockAlert : TW.stock;
    st.textContent = avail<=0 ? `Ya tienes ${DEC_MAX} decants de ${pd.ml} ml en tu carrito, el máximo por tamaño.` : 'Preparado a mano en 24 horas';
  } else {
    st.className = avail<=3 ? TW.stockAlert : TW.stock;
    st.innerHTML = p.stock===0 ? `Frasco agotado. <a class="underline" href="${urlDecant(p.id)}">Pruébalo en decant</a>` :
      avail<=0 ? `Ya tienes en tu carrito las ${p.stock} unidades disponibles.` :
      avail<=5 ? `Quedan ${avail} ${avail===1?'unidad':'unidades'}` : 'Disponible';
  }
  $('#pd-add').disabled = $('#pd-buy').disabled = avail<=0;
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if(!t || !p) return;
  const a = t.dataset.action;
  if(a==='tab') selectTab(t);
  if(a==='thumb'){
    $$('[data-action=thumb]').forEach(b => b.setAttribute('aria-pressed', b===t));
    $('#pd-main').innerHTML = foto(p, t.dataset.foto, fotoLabel(t.dataset.view));
    $('#pd-cap').textContent = t.dataset.view;
  }
  if(a==='pd-qty'){ pd.qty = Math.max(1, pd.qty + +t.dataset.d); updatePD(); }
  if(a==='pd-add' || a==='pd-buy'){
    if(addToCart(p.id, ES_DECANT?'decant':'frasco', pd.ml, pd.qty, a==='pd-buy')){
      if(a==='pd-buy') location.href = 'checkout.html';
      else { pd.qty = 1; updatePD(); }
    }
  }
});

/* Pestañas Descripción y Modo de uso: clic, flechas izquierda y derecha, Inicio y Fin */
function selectTab(tab, focus=false){
  $$('[role=tab]').forEach(t => {
    const on = t===tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  if(focus) tab.focus();
}
document.addEventListener('keydown', e => {
  const t = e.target.closest?.('[role=tab]');
  if(!t) return;
  const tabs = $$('[role=tab]'), i = tabs.indexOf(t);
  const next = {ArrowRight: tabs[(i+1)%tabs.length], ArrowLeft: tabs[(i-1+tabs.length)%tabs.length], Home: tabs[0], End: tabs[tabs.length-1]}[e.key];
  if(next){ e.preventDefault(); selectTab(next, true); }
});
