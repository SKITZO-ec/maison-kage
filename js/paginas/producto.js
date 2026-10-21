/* MAISON KAGE · Ficha de producto
   producto.html?id=khamrah                  ficha del frasco completo
   producto.html?id=khamrah&formato=decant   ficha del decant (apartado propio)
   En la ficha de decant cada tamaño se agrega al carrito con un solo clic */
if(!CATALOGO_CAIDO){
const p = byId(params.get('id'));
/* Ficha de decant solo si el perfume tiene decants, y siempre si no tiene frascos */
const ES_DECANT = !!p && decants(p).length>0 && (params.get('formato') === 'decant' || !frascos(p).length);
const KIND = ES_DECANT ? 'decant' : 'frasco';
const urlFrasco = id => urlProducto(id);
const urlDecant = id => urlProducto(id, true);
/* Presentaciones que se eligen en esta ficha */
const OPCIONES = p ? (ES_DECANT ? decants(p) : frascos(p)) : [];
/* Texto natural para el enlace de cada ocasión de uso */
const OCASION_TXT = {'Oficina':'la oficina','Diario':'el día a día','Citas':'citas','Noche':'la noche','Verano':'el verano','Eventos':'eventos'};
/* Nombre accesible de cada foto, por ejemplo Frasco de frente de Khamrah de Lattafa */
const fotoLabel = v => v+' de '+p.nombre+' de '+p.marca;
let pd;
if(!p) location.replace('404.html');
else {
  /* Si piden el decant de un perfume que no tiene, la dirección pasa a la del frasco */
  if(params.get('formato')==='decant' && !ES_DECANT) history.replaceState(null, '', urlFrasco(p.id));
  registrarVisto(p.id);
  renderProduct();
}

/* Hasta 4 perfumes parecidos, primero de la misma familia, luego del mismo origen y luego del mismo público */
function similares(){
  const puntos = x => (x.familia===p.familia ? 4 : 0) + (x.origen===p.origen ? 2 : 0) + (x.publico===p.publico ? 1 : 0);
  return PRODUCTS.filter(x => x.id!==p.id && (!ES_DECANT || decants(x).length) && puntos(x)>0)
    .map((x,i) => [x, puntos(x), i]).sort((a,b) => b[1]-a[1] || a[2]-b[2]).slice(0,4).map(a => a[0]);
}

/* Botón de un tamaño de decant. Debajo dice cuántos hay ya en el carrito */
function notaDecant(x){
  const n = enCarrito(p.id, 'decant', x.ml), max = maxDe(p, 'decant', x.ml), lleno = n >= max;
  return {lleno, cls: lleno ? TW.decAddNote+' text-red' : TW.decAddNote,
          txt: lleno ? `Máximo ${max} por tamaño` : n ? `En tu carrito, ${n}` : 'Preparado a mano en 24 horas'};
}
function decBtn(x){
  const nt = notaDecant(x);
  return `<div><button type="button" class="${TW.decAdd}" data-action="add-decant" data-id="${p.id}" data-ml="${x.ml}" aria-disabled="${nt.lleno}" aria-describedby="dec-n-${x.ml}">
      <span class="${TW.decAddTop}">Agregar ${x.ml} ml · ${money(x.precio)}</span><span class="${TW.decAddSub}">${DEC_SPRAYS[x.ml] || ''}</span></button>
    <p class="${nt.cls}" id="dec-n-${x.ml}" aria-live="polite">${nt.txt}</p></div>`;
}

function renderProduct(){
  pd = {ml: (OPCIONES.find(x => x.ml===5) || OPCIONES[0]).ml, qty: 1};
  document.title = (ES_DECANT ? 'Decant de ' : '') + p.nombre + ' de ' + p.marca + ' | Maison Kage';
  const views = ES_DECANT ? ['Decant en atomizador','Decant junto al frasco original','Etiqueta y sello Maison Kage']
                          : ['Frasco de frente','Frasco de perfil','Caja original'];
  /* nombre del archivo de cada vista dentro de img/productos */
  const files = ES_DECANT ? ['decant-atomizador','decant','decant-etiqueta'] : ['frente','perfil','caja'];
  const cr = TW.crumb;
  /* Opción tipo radio, recuadro que se pinta de azul noche al elegirlo */
  const opt = (name, ml, on, price) => `<label class="${TW.opt}"><input type="radio" name="${name}" value="${ml}" class="${TW.optInput}" ${on?'checked':''}><span class="${TW.optBox}"><strong class="${TW.optStrong}">${ml} ml</strong><small class="${TW.optSmall}">${price}</small></span></label>`;
  const sizes = OPCIONES.length > 1
    ? `<fieldset class="${TW.opts}"><legend class="${TW.optsLegend}">Tamaño</legend>${OPCIONES.map(x=>opt('pd-ml', x.ml, x.ml===pd.ml, money(precioFinal(p,x)))).join('')}</fieldset>`
    : `<p class="${TW.presFija}">Frasco ${OPCIONES[0].ml} ml</p>`;
  const compra = ES_DECANT ? `
        <h2 class="${TW.optsLegend} mt-6">Elige el tamaño y se agrega a tu carrito</h2>
        <div class="${TW.decAddGrid}" id="dec-btns">${OPCIONES.map(decBtn).join('')}</div>
        <div class="${TW.pdActions}">${favBtn(p, true)}</div>` : `
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
        </div>`;
  const ocasiones = p.ocasion.map(o => `<li><a class="${TW.tagLink}" href="catalogo.html?ocasion=${encodeURIComponent(o)}" aria-label="Ver perfumes para ${OCASION_TXT[o]||o}">${o}</a></li>`).join('');
  const ds = decants(p);

  $('#app').innerHTML = `
    <nav aria-label="Migas de pan"><ol class="${TW.crumbs}">
      <li class="${cr}"><a class="underline" href="index.html">Inicio</a></li>
      ${ES_DECANT
        ? `<li class="${cr}"><a class="underline" href="catalogo.html?decant=1">Decants</a></li>`
        : `<li class="${cr}"><a class="underline" href="catalogo.html">Perfumes</a></li><li class="${cr}"><a class="underline" href="catalogo.html?origen=${p.origen}">${ORIGENES[p.origen]}</a></li>`}
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
        <p class="${TW.eyebrow}">${esc(p.marca)} · ${ES_DECANT ? 'Decant' : 'Perfume '+ORIGENES[p.origen].toLowerCase()}</p>
        <h1 class="${TW.pdName}">${esc(p.nombre)}</h1>
        <p class="${TW.pdMeta}">${ES_DECANT ? `Decant de ${p.conc} · Atomizador de vidrio` : `${p.conc} · ${PUBLICOS[p.publico]} · ${FAMILIAS[p.familia]}`}</p>
        ${ES_DECANT ? `<p class="${TW.priceLg}">Desde ${money(ds[0].precio)}</p>` : `<div class="${TW.pdPrice}">
          <span class="${TW.priceLg}" id="pd-price"></span>
          ${p.oferta ? `<s class="${TW.priceOld}" id="pd-old"></s><span class="${TW.sealInline}" aria-label="Oferta, ${p.oferta} por ciento de descuento">-${p.oferta}%</span>` : ''}
        </div>`}
        ${compra}
        <div class="${TW.pdOcc}"><h2 class="${TW.miniTitle}">Ocasión de uso</h2><ul class="${TW.tags}">${ocasiones}</ul></div>
        <ul class="${TW.perks}">
          <li class="${TW.perk}">${ICON.truck} Envío ${money(SHIP)}, gratis desde ${money(FREE_SHIP)}, o retiro gratis en Quito</li>
          <li class="${TW.perk}">${ICON.shield} ${ES_DECANT ? 'Del mismo frasco original, envasado a mano' : 'Producto original con sello de cera Maison Kage'}</li>
          <li class="${TW.perk}">${ICON.check} Pago con tarjeta o con Deuna</li>
        </ul>
        ${ES_DECANT && frascos(p).length ? `<p class="${TW.crossLink}">¿Te gustó? <a class="underline font-semibold" href="${urlFrasco(p.id)}">Ver el frasco completo de ${esc(p.nombre)}</a></p>` : ''}
        <p class="${TW.small} mt-4">¿Quieres que dure más en tu piel? <a class="underline" href="ayuda.html#modo-uso">Mira cómo aplicarlo</a>.</p>
      </div>
    </div>

    <section class="${TW.descWrap}" aria-labelledby="h-desc">
      <h2 class="${TW.sectionTitle}" id="h-desc"><span>Descripción</span></h2>
      <p>${esc(p.desc)}</p>
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
        <ul class="${TW.accords}">${p.acordes.map(([n,v])=>`<li class="${TW.accord}"><span>${n}</span><span class="${TW.meter}" role="img" aria-label="${n}, intensidad ${v} de 100"><span class="${TW.meterFill}" style="width:${v}%"></span></span></li>`).join('')}</ul>
      </section>
    </div>

    ${ES_DECANT || !ds.length ? '' : `
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
          <p>Pruébalo desde <strong>${money(ds[0].precio)}</strong> antes de comprar el frasco. Hay decants de ${ds.map(x=>x.ml).join(', ').replace(/, (\d+)$/, ' y $1')} ml.</p>
          <a class="${TW.btnNavy} mt-4" href="${urlDecant(p.id)}">Ver el decant</a>
        </div>
      </div>
    </section>`}

    <section class="${TW.block}" aria-labelledby="h-rel">
      <h2 class="${TW.sectionTitle}" id="h-rel"><span>${ES_DECANT ? 'Otros decants que te pueden gustar' : 'También te puede gustar'}</span></h2>
      <div class="${TW.grid}">${similares().map(x => card(x, ES_DECANT ? 'decant' : '')).join('')}</div>
    </section>
    ${vistosHTML(p.id)}`;
  $$('input[name=pd-ml]').forEach(i => i.addEventListener('change', e => { pd.ml = +e.target.value; pd.qty = 1; updatePD(); }));
  if(!ES_DECANT) updatePD();
}

/* Refresca los botones de decant sin volver a dibujarlos, así el foco no se pierde */
function actualizarDecants(){
  OPCIONES.forEach(x => {
    const b = $(`#dec-btns [data-ml="${x.ml}"]`), nota = $('#dec-n-'+x.ml), nt = notaDecant(x);
    if(!b) return;
    b.setAttribute('aria-disabled', nt.lleno); nota.className = nt.cls; nota.textContent = nt.txt;
  });
}
document.addEventListener('mk:carrito', () => { if(p && ES_DECANT) actualizarDecants(); });

function updatePD(){
  const pres = presOf(p, KIND, pd.ml);
  const avail = maxDe(p, KIND, pd.ml) - enCarrito(p.id, KIND, pd.ml);
  if(pd.qty > Math.max(avail,1)) pd.qty = Math.max(avail,1);
  $('#pd-price').textContent = `${money(precioFinal(p, pres))} · ${pd.ml} ml`;
  if(p.oferta) $('#pd-old').innerHTML = `<span class="sr-only">Precio anterior </span>${money(pres.precio)}`;
  $('#pd-qty').textContent = pd.qty;
  const [minus, plus] = $$('[data-action=pd-qty]');
  /* Se usa aria-disabled en lugar de disabled para que el botón no pierda el foco */
  minus.setAttribute('aria-disabled', pd.qty<=1); plus.setAttribute('aria-disabled', pd.qty>=avail);
  const st = $('#pd-stock');
  st.className = avail<=3 ? TW.stockAlert : TW.stock;
  st.innerHTML = pres.stock===0 ? `Frasco de ${pd.ml} ml agotado.${decants(p).length?` <a class="underline" href="${urlDecant(p.id)}">Pruébalo en decant</a>`:''}` :
    avail<=0 ? `Ya tienes en tu carrito las ${pres.stock} unidades disponibles.` :
    avail<=5 ? `Quedan ${avail} ${avail===1?'unidad':'unidades'}` : 'Disponible';
  $('#pd-add').setAttribute('aria-disabled', avail<=0); $('#pd-buy').setAttribute('aria-disabled', avail<=0);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if(!t || !p) return;
  if(t.getAttribute('aria-disabled')==='true') return;
  const a = t.dataset.action;
  if(a==='thumb'){
    $$('[data-action=thumb]').forEach(b => b.setAttribute('aria-pressed', b===t));
    $('#pd-main').innerHTML = foto(p, t.dataset.foto, fotoLabel(t.dataset.view));
    $('#pd-cap').textContent = t.dataset.view;
  }
  if(a==='pd-qty'){ pd.qty = Math.max(1, pd.qty + +t.dataset.d); updatePD(); }
  if(a==='pd-add' || a==='pd-buy'){
    if(addToCart(p.id, KIND, pd.ml, pd.qty, a==='pd-buy')){
      if(a==='pd-buy') location.href = 'checkout.html';
      else { pd.qty = 1; updatePD(); }
    }
  }
});
}
