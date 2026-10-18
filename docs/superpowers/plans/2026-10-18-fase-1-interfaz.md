# Fase 1, interfaz de alta fidelidad. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar sobre el sitio estático actual todos los cambios de interfaz de la Fase 1 y el catálogo de 70 perfumes, todavía con `sessionStorage`, dejando el código listo para conectarlo a la API en la Fase 2.

**Architecture:** El sitio sigue siendo HTML estático con Tailwind por CDN y JavaScript sin módulos (globales cargados en orden `clases.js`, `datos.js`, `productos.js`, `estado.js`, `comun.js`, script de la página). El encabezado y el pie pasan a una plantilla única que un script copia a las 16 páginas. El producto cambia a un modelo con lista de presentaciones, igual a la tabla `Presentacion` de la Fase 2.

**Tech Stack:** HTML, Tailwind CSS 3 por CDN, JavaScript del navegador, Node 22 para el script de plantillas, Playwright para las pruebas, `python3 -m http.server` como servidor local.

**Spec:** `docs/superpowers/specs/2026-10-18-alta-fidelidad-design.md`

## Global Constraints

- Todo el trabajo va en la rama `alta-fidelidad`. No se toca `main`.
- Cada commit se hace con `git -c user.name="Rodrigo Cordero" -c user.email="rodrigocorderp@gmail.com" commit -m "..."`, mensaje en español y **sin líneas de coautor ni de atribución a Claude**. Después de cada commit, `git push origin alta-fidelidad`.
- Comentarios del código en español, con la voz de Rodrigo y sin rayas largas, punto y coma ni dos puntos. Los textos visibles del sitio tampoco usan rayas largas.
- Paleta cerrada de `js/tailwind.config.js` (navy, ivory, gold, red, smoke). Diseño minimalista, sin botones de navegación innecesarios.
- Envío $3.50, gratis desde $60.00. Decants de 2, 5 y 10 ml, máximo 10 unidades por tamaño y por perfume. Las ofertas solo afectan a los frascos.
- Teléfono de 10 dígitos que empieza con 09. Tarjeta de 14 a 16 dígitos, nunca más de 16.
- El inicio de sesión se exige solo al pagar o al guardar un favorito.
- Objetivos táctiles de al menos 44 px en controles principales y nunca menos de 24 px en ningún control.
- Tres rangos de pantalla a revisar, 1024 px o más, 768 a 1023 px y 320 a 767 px.
- Fuera de esta fase quedan las URLs limpias `/perfumes/<id>`, `/ofertas` y `/decants` (necesitan Express), los estados de carga y error de la API, la seguridad del servidor, el correo, las imágenes, el video y la medición con Lighthouse.

## Review Focus

- Un carrito guardado con la forma vieja de producto o con una presentación que ya no existe no debe romper ninguna página. La línea inválida se descarta. Prueba en la Tarea 2.
- `login.html?next=` con una dirección externa o con código debe llevar a `perfil.html`, y con `producto.html?id=khamrah` debe volver a esa ficha. Prueba en la Tarea 6.
- `producto.html?id=` desconocido va a `404.html`, y `formato=decant` en un perfume sin decants muestra la ficha del frasco. Prueba en la Tarea 5.
- Pegar `4111-1111-1111-1111 9999` en la tarjeta deja 16 dígitos, y pegar `099 123 4567` en el celular deja `0991234567`. Prueba en la Tarea 7.
- Hacer clic 11 veces en el decant de 2 ml deja 10 en el carrito y muestra el aviso del máximo. Prueba en la Tarea 5.

---

### Task 0: Entorno de pruebas

**Files:**
- Modify: `package.json`
- Create: `playwright.config.js`
- Create: `tests/soporte/tailwind.cjs` (adapta `js/tailwind.config.js` al CLI de Tailwind)
- Create: `tests/soporte/fixtures.js` (fixture `page` que sirve Tailwind local y junta errores de consola)
- Create: `tests/e2e/humo.spec.js`
- Modify: `.gitignore` (agregar `node_modules/`, `test-results/`, `playwright-report/`, `tests/.tw.css`)

**Interfaces:**
- Produces: `test` y `expect` exportados por `tests/soporte/fixtures.js`. La fixture `page` ya tiene el CDN de Tailwind redirigido y expone `page.erroresConsola` (arreglo de textos). Todas las pruebas importan desde ahí.
- Produces: script `npm test`, que construye `tests/.tw.css` y corre Playwright.

- [ ] **Step 1: Instalar dependencias de prueba**

Run: `npm install --save-dev @playwright/test@1.56.1 tailwindcss@3.4.17`
Expected: se agregan a `devDependencies` sin descargar navegadores (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` ya está definido).

- [ ] **Step 2: Configurar Playwright y Tailwind local**

`playwright.config.js` usa `webServer: {command: 'python3 -m http.server 4173', port: 4173, reuseExistingServer: true}`, `use.baseURL: 'http://localhost:4173/'` y `launchOptions.executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`. Define tres proyectos con `viewport` de 1280x800, 800x1000 y 375x812, llamados `escritorio`, `tablet` y `movil`.

`tests/soporte/tailwind.cjs` lee `js/tailwind.config.js` con `vm.runInNewContext` sobre un objeto `{tailwind:{}}` y exporta `{...tailwind.config, content: ['./*.html', './plantillas/*.html', './js/**/*.js']}`.

`package.json` tiene `"test": "tailwindcss -c tests/soporte/tailwind.cjs -o tests/.tw.css && playwright test"`.

La fixture redirige el CDN, porque el entorno de pruebas no llega a `cdn.tailwindcss.com`.

```js
await page.route('https://cdn.tailwindcss.com/**', r => r.fulfill({
  contentType: 'text/javascript',
  body: "window.tailwind={};document.head.insertAdjacentHTML('beforeend','<link rel=\"stylesheet\" href=\"/tests/.tw.css\">');"
}));
page.erroresConsola = [];
page.on('pageerror', e => page.erroresConsola.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) page.erroresConsola.push(m.text()); });
```

Las fotos que faltan generan errores 404 de recursos, y por eso esos mensajes se ignoran.

- [ ] **Step 3: Escribir la prueba de humo**

```js
const PAGINAS = ['index','catalogo','buscar','producto','carrito','checkout','confirmacion','login','registro','recuperar','perfil','direcciones','favoritos','pedidos','ayuda','404'];
for (const p of PAGINAS) test(`${p} carga sin errores`, async ({ page }) => {
  await page.goto(`${p}.html${p==='producto'?'?id=khamrah':''}`);
  await expect(page.locator('header').first()).toBeVisible();
  expect(page.erroresConsola).toEqual([]);
});
```

- [ ] **Step 4: Correr las pruebas**

Run: `npm test -- --project=escritorio`
Expected: 16 pruebas PASS. Si alguna página falla hoy, se anota y se corrige en la tarea que toca esa página.

- [ ] **Step 5: Commit** con el mensaje `Agregar entorno de pruebas con Playwright`.

---

### Task 1: Plantilla única de encabezado y pie

**Files:**
- Create: `plantillas/encabezado.html` (copia exacta del `<header class="bg-navy ...">...</header>` actual de `index.html`)
- Create: `plantillas/pie.html` (copia exacta del `<footer>...</footer>` actual)
- Create: `herramientas/maquetar.mjs`
- Modify: las 16 páginas `*.html`
- Create: `tests/e2e/plantillas.spec.js`

**Interfaces:**
- Produces: `node herramientas/maquetar.mjs`, que reemplaza en cada `*.html` de la raíz el bloque desde `<header class="bg-navy` hasta su primer `</header>` por `plantillas/encabezado.html`, y el bloque `<footer ...>...</footer>` por `plantillas/pie.html`. Termina con código 1 si una página no tiene alguno de los dos bloques. Las tareas siguientes cambian el menú y el pie editando solo las plantillas y corriendo este script.

- [ ] **Step 1: Escribir la prueba**

```js
test('las 16 páginas usan la plantilla', async () => {
  const enc = fs.readFileSync('plantillas/encabezado.html','utf8').trim();
  const pie = fs.readFileSync('plantillas/pie.html','utf8').trim();
  for (const f of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(f,'utf8');
    expect(html, f).toContain(enc);
    expect(html, f).toContain(pie);
  }
});
```

- [ ] **Step 2: Correrla y ver que falla** porque las plantillas no existen.

- [ ] **Step 3: Crear las plantillas y `herramientas/maquetar.mjs`, y ejecutarlo**

Run: `node herramientas/maquetar.mjs && git diff --stat`
Expected: el script no cambia ninguna página (las plantillas son copias exactas) y la prueba pasa.

- [ ] **Step 4: Correr** `npm test -- --project=escritorio` y ver todo en PASS.

- [ ] **Step 5: Commit** con el mensaje `Unificar encabezado y pie en una plantilla`.

---

### Task 2: Modelo de producto con presentaciones

**Files:**
- Modify: `js/datos.js` (solo constantes y diccionarios)
- Create: `js/productos.js` (arreglo `PRODUCTS` con los 12 perfumes actuales convertidos, con la descripción dentro de cada producto)
- Modify: las 16 páginas, agregando `<script src="js/productos.js"></script>` entre `datos.js` y `estado.js`
- Modify: `js/comun.js` (funciones de precio, stock, tarjeta y carrito)
- Modify: `js/paginas/producto.js`, `carrito.js`, `checkout.js`, `catalogo.js`, `buscar.js`, `inicio.js`
- Create: `tests/e2e/modelo.spec.js`

**Interfaces:**
- Produces, en `js/datos.js`:
  - `ORIGENES = {arabe:'Árabe', disenador:'Diseñador', nicho:'Nicho'}`
  - `PUBLICOS = {hombre:'Hombre', mujer:'Mujer', unisex:'Unisex'}`
  - `FAMILIAS = {citrico:'Cítrico y fresco', floral:'Floral', amaderado:'Amaderado', oriental:'Oriental y ámbar', gourmand:'Gourmand', aromatico:'Aromático', cuero:'Cuero y especiado'}`
  - `OCASIONES = ['Oficina','Diario','Citas','Noche','Verano','Eventos']`
  - `CONCENTRACIONES = ['Eau de Toilette','Eau de Parfum','Parfum','Extrait']`
  - Se conservan `DEC_SIZES`, `DEC_SPRAYS`, `DEC_MAX`, `SHIP`, `FREE_SHIP`, `LOCAL`, `RASTREO_URL`, `CIUDADES`. Se eliminan `COLS`, `TIPOS`, `DESC`, `USO_CONC` y `USO_PASOS` (el modo de uso pasa a Ayuda en la Tarea 5).
- Produces, forma de cada producto en `js/productos.js`:
  `{id, nombre, marca, origen, publico, familia, conc, ocasion:[...], oferta, novedad, top, notas:[[salida],[corazón],[fondo]], acordes:[[nombre, 0..100]], desc, pres:[{tipo:'frasco'|'decant', ml, precio, stock}]}`.
  `oferta` es el porcentaje de descuento del frasco (0 si no hay). `top` marca los más vendidos.
- Produces, en `js/comun.js`:
  - `frascos(p) -> pres[]` y `decants(p) -> pres[]`, ordenados por `ml`
  - `presOf(p, tipo, ml) -> pres | undefined`
  - `precioFinal(p, pres) -> number`, que aplica `oferta` solo a frascos y redondea a centavos
  - `precioDesde(p) -> number`, el menor precio final de frasco, o el menor de decant si no hay frascos
  - `urlProducto(id, decant=false) -> string`
  - `unitPrice(l)` y `addToCart(id, kind, ml, qty, silent=false)` conservan su firma. El stock se controla por presentación, y para decants el límite es `Math.min(DEC_MAX, pres.stock)`.
  - `limpiarCarrito()` quita del `state.cart` las líneas cuyo `presOf` no existe y se llama al iniciar `comun.js`.
- Consumes: `card(p, modo)` conserva su firma. En modo frasco muestra `precioDesde(p)` y el ml del frasco más pequeño. Muestra "Decant desde" solo si `decants(p).length`.

- [ ] **Step 1: Escribir las pruebas**

```js
test('precio con oferta solo en frasco', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => { const p = byId('khamrah');
    return [precioFinal(p, presOf(p,'frasco',50)), precioFinal(p, presOf(p,'decant',2))]; });
  expect(r).toEqual([27.2, 3.5]);
});
test('carrito con línea vieja no rompe', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => sessionStorage.setItem('mk-sesion', JSON.stringify({cart:[{id:'khamrah',kind:'frasco',ml:50,qty:1},{id:'no-existe',kind:'frasco',ml:50,qty:1},{id:'khamrah',kind:'decant',ml:7,qty:1}]})));
  await page.goto('carrito.html');
  await expect(page.locator('#app li')).toHaveCount(1);
  expect(page.erroresConsola).toEqual([]);
});
test('agregar frasco respeta el stock de esa presentación', async ({ page }) => {
  await page.goto('producto.html?id=sauvage');
  const ok = await page.evaluate(() => [addToCart('sauvage','frasco',50,3,true), addToCart('sauvage','frasco',50,1,true)]);
  expect(ok).toEqual([true, false]);
});
```

Sauvage tiene `stock: 3` en su frasco de 50 ml en la conversión.

- [ ] **Step 2: Correrlas y ver que fallan** porque `precioFinal` y `presOf` no existen.

- [ ] **Step 3: Convertir los 12 perfumes**

Cada frasco de 50 y 100 ml pasa a dos presentaciones de tipo frasco. El stock actual del producto queda en el de 50 ml, y el de 100 ml recibe `Math.ceil(stock/2)`. Cada precio de `dec` pasa a una presentación de decant con `stock: 40`. `tipo` pasa a `origen`.

Las colecciones se reasignan a familias. Khamrah, 9PM, Yara y Good Girl van a `gourmand`. Asad y Le Male Elixir van a `oriental`. Club de Nuit Intense va a `cuero`. Hawas va a `citrico`. Ana Abiyedh va a `floral`. Sauvage va a `aromatico`. Born in Roma va a `amaderado`. Libre va a `floral`.

Las ocasiones viejas se traducen así: Día pasa a Diario, Fiesta pasa a Eventos, Invierno pasa a Noche, y se quitan los duplicados. `tend` pasa a `top`, y `novedad` queda en `false`. `DESC[id]` pasa al campo `desc`.

- [ ] **Step 4: Implementar las funciones de `comun.js`** y cambiar todas las páginas que usaban `p50`, `p100`, `p.dec`, `p.stock`, `finalPrice`, `basePrice`, `decPrice`, `p.col`, `p.tipo`, `COLS`, `TIPOS` y `DESC`.

Run: `grep -rnE "p50|p100|\.dec\b|\.dec\[|finalPrice|basePrice|decPrice|COLS|TIPOS|DESC\[|\.col\b|\.tipo\b" js`
Expected: sin resultados.

En la ficha, mientras llega la Tarea 5, el selector de tamaño se arma con `frascos(p)` o `decants(p)` en lugar de las listas fijas.

- [ ] **Step 5: Correr** `npm test -- --project=escritorio`. Todo debe quedar en PASS, incluida la prueba de humo.

- [ ] **Step 6: Commit** con el mensaje `Cambiar el producto a un modelo con presentaciones`.

---

### Task 3: Catálogo de 70 perfumes

**Files:**
- Modify: `js/productos.js`
- Create: `tests/e2e/catalogo-datos.spec.js`

**Interfaces:**
- Consumes: la forma de producto de la Tarea 2.
- Produces: 70 productos con `id` únicos en minúsculas y guiones.

- [ ] **Step 1: Escribir la prueba de categorías**

```js
test('cada categoría tiene al menos 10 perfumes', async ({ page }) => {
  await page.goto('index.html');
  const c = await page.evaluate(() => {
    const n = f => PRODUCTS.filter(f).length, out = {total: PRODUCTS.length, ids: new Set(PRODUCTS.map(p=>p.id)).size};
    Object.keys(PUBLICOS).forEach(k => out['publico:'+k] = n(p=>p.publico===k));
    Object.keys(ORIGENES).forEach(k => out['origen:'+k] = n(p=>p.origen===k));
    Object.keys(FAMILIAS).forEach(k => out['familia:'+k] = n(p=>p.familia===k));
    OCASIONES.forEach(k => out['ocasion:'+k] = n(p=>p.ocasion.includes(k)));
    CONCENTRACIONES.forEach(k => out['conc:'+k] = n(p=>p.conc===k));
    out.oferta = n(p=>p.oferta>0); out.novedad = n(p=>p.novedad); out.top = n(p=>p.top);
    out.decant = n(p=>decants(p).length>0);
    out.unaPres = n(p=>p.pres.length===1);
    out.malos = PRODUCTS.filter(p => !p.desc || p.notas.length!==3 || !p.pres.length || !FAMILIAS[p.familia]).map(p=>p.id);
    return out;
  });
  expect(c.total).toBe(70); expect(c.ids).toBe(70); expect(c.malos).toEqual([]);
  for (const [k,v] of Object.entries(c)) if (k.includes(':') || ['oferta','novedad','top','decant'].includes(k)) expect(v, k).toBeGreaterThanOrEqual(10);
  for (const k of Object.keys(c).filter(k=>k.startsWith('familia:'))) expect(c[k], k).toBe(10);
  expect(c.unaPres).toBeGreaterThanOrEqual(5);
});
```

- [ ] **Step 2: Correrla y ver que falla** con `total` igual a 12.

- [ ] **Step 3: Agregar los 58 perfumes nuevos**

Los datos son ficticios (precios, stock, notas, acordes y descripción de 3 a 4 oraciones en el tono de las actuales), con marcas coherentes con su origen. Debe haber al menos 5 perfumes con una sola presentación, por ejemplo solo frasco de 100 ml o solo frasco sin decants. Ningún precio de decant supera al del frasco más pequeño.

- [ ] **Step 4: Correr** `npm test -- --project=escritorio` y ver todo en PASS.

- [ ] **Step 5: Commit** con el mensaje `Ampliar el catálogo a 70 perfumes`.

---

### Task 4: Navegación, catálogo, carrito visible y pie

**Files:**
- Modify: `plantillas/encabezado.html`, `plantillas/pie.html`, y luego `node herramientas/maquetar.mjs`
- Modify: `js/comun.js` (`markNav`, `updateCartBadge`), `js/paginas/catalogo.js`, `js/paginas/inicio.js`, `index.html` (secciones del inicio)
- Create: `tests/e2e/navegacion.spec.js`

**Interfaces:**
- Produces: parámetros del catálogo `publico`, `origen`, `familia`, `ocasion`, `conc`, `oferta=1`, `novedad=1`, `top=1` y `decant=1`. Todas las páginas los usan para enlazar categorías.

Lo que cambia:
- Se quitan el enlace "Catálogo" de la barra y "Catálogo completo" del menú móvil.
- El panel **Perfumes** tiene los grupos Público, Origen, Familia olfativa y Ocasión, una columna Destacados (Ofertas, Novedades, Más vendidos, Decants) y un botón "Ver todos los perfumes" hacia `catalogo.html`.
- En el menú móvil cada grupo es un `<details>` cerrado, para que la lista no muestre las 23 opciones de golpe.
- El catálogo filtra por los mismos ejes, más precio. Sus migas dicen "Perfumes" en lugar de "Catálogo", y el título sin filtros es "Todos los perfumes".
- El botón del carrito muestra el icono, el texto "Carrito" y el contador, con fondo dorado y alto de 46 px, en todos los anchos.
- El pie cambia "Catálogo" por "Perfumes" y agrega una columna **Visítanos** con `LOCAL.dir`, `LOCAL.horario` y un enlace "Ver en el mapa" (`https://www.google.com/maps/search/?api=1&query=` más la dirección codificada) que se abre en otra pestaña con aviso para lectores de pantalla.
- El inicio muestra Ofertas de la semana, Novedades y Más vendidos.

- [ ] **Step 1: Escribir las pruebas**

```js
test('no existe el enlace Catálogo y Perfumes tiene Ver todos', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('header a', { hasText: /^Catálogo/ })).toHaveCount(0);
  await expect(page.locator('footer a', { hasText: /^Catálogo$/ })).toHaveCount(0);
  await expect(page.locator('#mega a[href="catalogo.html"]', { hasText: 'Ver todos los perfumes' })).toHaveCount(1);
});
test('filtro por familia muestra 10', async ({ page }) => {
  await page.goto('catalogo.html?familia=floral');
  await expect(page.locator('#cat-count')).toHaveText('10 perfumes de 70');
  await expect(page.locator('nav[aria-label="Migas de pan"]')).toContainText('Perfumes');
});
test('botón del carrito con texto y contador', async ({ page }) => {
  await page.goto('index.html');
  const b = page.locator('#cart-link');
  await expect(b).toContainText('Carrito');
  expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
});
test('pie con ubicación del local', async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('footer')).toContainText('Av. República de El Salvador N34-127 y Suiza, Quito');
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Reorganizar el menú Perfumes y quitar Catálogo`.

---

### Task 5: Ficha de producto, decants con un clic y Ayuda

**Files:**
- Modify: `js/paginas/producto.js`, `js/comun.js` (`card` en modo decant, acción `add-decant`), `ayuda.html`
- Create: `js/vistos.js`, cargado en `index.html` y `producto.html` después de `comun.js`
- Create: `tests/e2e/producto.spec.js`

**Interfaces:**
- Produces: acción delegada `data-action="add-decant" data-id data-ml`, que llama `addToCart(id,'decant',ml,1)` y refresca el contador del botón. Se usa en la ficha de decant y en la tarjeta en modo decant.
- Produces, en `js/vistos.js`:
  - `registrarVisto(id)`, que guarda hasta 8 ids en `sessionStorage['mk-vistos']`, sin repetir y con el más reciente primero
  - `vistosHTML(excluirId) -> string`, que devuelve la sección "Vistos recientemente" con hasta 4 tarjetas, o `''` si no hay

Lo que cambia:
- **Se quitan las pestañas.** La descripción queda como sección simple con título "Descripción", y el modo de uso desaparece de la ficha.
- **Ayuda gana dos preguntas.** "¿Cómo aplicar un perfume para que dure más?" lleva los 4 pasos de `USO_PASOS` como lista ordenada. "¿Cuánto dura cada concentración?" explica Eau de Toilette, Eau de Parfum, Parfum y Extrait (este último "la concentración más intensa, con 1 o 2 atomizaciones es suficiente"), más la nota de rendimiento del decant de 5 ml.
- **Ficha de decant.** Cada tamaño es un botón `Agregar 2 ml · $3.50` que suma una unidad al carrito. Debajo de cada botón aparece "En tu carrito, N", y el botón se desactiva al llegar al máximo con el texto "Máximo 10 por tamaño". Se quitan el selector de tamaño, el de cantidad y "Comprar ahora" de esta ficha.
- **Tarjeta en modo decant.** Los tamaños son botones con el mismo comportamiento y nombre accesible "Agregar decant de 5 ml de Khamrah al carrito, $7.00".
- **Ficha de frasco con una sola presentación.** Muestra el texto "Frasco 100 ml" en lugar del grupo de radios.
- **Perfume sin decants.** No muestra la franja de decant. Si se abre con `formato=decant`, se reemplaza la URL por la del frasco.
- **Productos similares.** Hasta 4, priorizando la misma familia, luego el mismo origen y luego el mismo público, sin repetir el actual.
- **Vistos recientemente.** Se agrega al final de la ficha y del inicio.

- [ ] **Step 1: Escribir las pruebas**

```js
test('decant con un clic y tope de 10', async ({ page }) => {
  await page.goto('producto.html?id=khamrah&formato=decant');
  const b = page.getByRole('button', { name: /Agregar 2 ml/ });
  for (let i = 0; i < 11; i++) if (await b.isEnabled()) await b.click();
  expect(await page.evaluate(() => state.cart.find(l=>l.kind==='decant'&&l.ml===2).qty)).toBe(10);
  await expect(b).toBeDisabled();
});
test('sin pestaña Modo de uso y FAQ en Ayuda', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByText('Modo de uso')).toHaveCount(0);
  await page.goto('ayuda.html');
  await expect(page.getByText('¿Cómo aplicar un perfume para que dure más?')).toBeVisible();
});
test('id desconocido va a 404 y decant sin decants va al frasco', async ({ page }) => {
  await page.goto('producto.html?id=no-existe');
  await expect(page).toHaveURL(/404\.html/);
  const sinDecant = await page.evaluate(() => PRODUCTS.find(p => !decants(p).length).id);
  await page.goto(`producto.html?id=${sinDecant}&formato=decant`);
  await expect(page).not.toHaveURL(/formato=decant/);
});
test('una sola presentación no muestra selector', async ({ page }) => {
  await page.goto('index.html');
  const id = await page.evaluate(() => PRODUCTS.find(p => p.pres.length===1).id);
  await page.goto(`producto.html?id=${id}`);
  await expect(page.locator('input[name=pd-ml]')).toHaveCount(0);
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Decants con un clic y modo de uso en Ayuda`.

---

### Task 6: Sesión al pagar y aviso del corazón

**Files:**
- Modify: `js/comun.js`, `js/paginas/checkout.js`, `js/paginas/login.js`, `js/paginas/registro.js`, `js/clases.js` (clases del aviso)
- Create: `tests/e2e/sesion.spec.js`

**Interfaces:**
- Produces, en `js/comun.js`:
  - `safeNext(raw, fallback='perfil.html') -> string`, que acepta solo `^[a-z0-9-]+\.html(\?[a-z0-9=&%._-]*)?$` y si no devuelve `fallback`. `login.js` y `registro.js` la usan.
  - `abrirAvisoFavorito(btn)` y `cerrarAvisoFavorito(devolverFoco=true)`
  - `sessionStorage['mk-fav-pendiente']`, que guarda el id del perfume, y `aplicarFavoritoPendiente()`, que se llama al iniciar `comun.js` cuando hay sesión. Lo guarda en favoritos, muestra el aviso "X se guardó en tus favoritos" y borra la clave.

Lo que cambia:
- **Checkout sin sesión.** Llama `flash('Inicia sesión o crea una cuenta para terminar tu compra. Tu carrito está guardado.')` y redirige a `login.html?next=checkout.html`. Se quita el texto "compra como invitado".
- **Login y registro.** Pasan `next` entre sí, así el usuario puede ir de uno al otro sin perder el destino.
- **Corazón sin sesión.** No guarda el favorito. Abre un aviso pequeño anclado debajo del corazón, con `role="dialog"`, `aria-modal="false"`, `aria-labelledby` y el texto "Para guardar tus favoritos crea una cuenta. Si ya tienes una, inicia sesión." Tiene dos enlaces, "Crear cuenta" y "Iniciar sesión", ambos con `next` igual a la página actual con sus parámetros, y un botón "Cerrar".
- **Foco del aviso.** Al abrirse, el foco pasa al primer enlace. Escape, el botón Cerrar o un clic afuera lo cierran y el foco vuelve al corazón. Al salir con Tab del último elemento también se cierra. No atrapa el foco.

- [ ] **Step 1: Escribir las pruebas**

```js
test('checkout sin sesión pide login y vuelve', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await page.evaluate(() => addToCart('khamrah','frasco',50,1,true));
  await page.goto('checkout.html');
  await expect(page).toHaveURL(/login\.html\?next=checkout\.html/);
  await page.fill('#lg-email', 'ana@correo.com'); await page.fill('#lg-pass', 'clave1234');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/checkout\.html/);
});
test('next externo o con código va a perfil', async ({ page }) => {
  await page.goto('index.html');
  const r = await page.evaluate(() => [safeNext('https://malo.com'), safeNext('javascript:alert(1)'), safeNext('producto.html?id=khamrah')]);
  expect(r).toEqual(['perfil.html','perfil.html','producto.html?id=khamrah']);
});
test('aviso del corazón con teclado', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  const corazon = page.locator('[data-action=fav]').first();
  await corazon.focus(); await page.keyboard.press('Enter');
  const aviso = page.getByRole('dialog', { name: /favoritos/i });
  await expect(aviso).toBeVisible();
  await expect(aviso.getByRole('link', { name: 'Crear cuenta' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(aviso).toBeHidden();
  await expect(corazon).toBeFocused();
  expect(await page.evaluate(() => state.favs.length)).toBe(0);
});
test('favorito pendiente se guarda al iniciar sesión', async ({ page }) => {
  await page.goto('producto.html?id=khamrah');
  await page.locator('[data-action=fav]').first().click();
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.fill('#lg-email', 'ana@correo.com'); await page.fill('#lg-pass', 'clave1234');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/producto\.html\?id=khamrah/);
  expect(await page.evaluate(() => state.favs)).toEqual(['khamrah']);
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Pedir sesión al pagar y aviso al guardar favoritos`.

---

### Task 7: Campos con límites, registro y perfil

**Files:**
- Modify: `js/comun.js` (`soloDigitos`, `formatCard`, escucha de `input` y `paste`, `hashPass`), `registro.html`, `js/paginas/registro.js`, `js/paginas/login.js`, `perfil.html`, `js/paginas/perfil.js`, `direcciones.html`, `js/paginas/checkout.js`
- Create: `tests/e2e/campos.spec.js`

**Interfaces:**
- Produces, en `js/comun.js`:
  - `soloDigitos(v, max) -> string`
  - `formatCard(v) -> string`, con 16 dígitos como máximo agrupados de 4 en 4
  - Una escucha global que aplica `soloDigitos` a todo input con `data-digits="N"` y `formatCard` a todo input con `data-card`, conservando la posición del cursor al final
  - `hashPass(pass) -> Promise<string>`, SHA-256 en hexadecimal con `crypto.subtle`. Es temporal, la Fase 2 lo reemplaza por bcrypt en el servidor.
- Las cuentas guardan `passHash`. El login rechaza la contraseña cuando la cuenta existe y el hash no coincide, con el mensaje "El correo o la contraseña no son correctos." No dice cuál de los dos falló. Si la cuenta no existe se crea, como en el prototipo actual.

Lo que cambia:
- Todos los celulares (`co-tel`, `pf-tel`, `ad-tel` y el nuevo `rg-tel`) llevan `type="tel" inputmode="numeric" maxlength="10" data-digits="10"`.
- La tarjeta `cd-num` lleva `data-card` y `maxlength="19"` para dejar lugar a los espacios. `RULES.card` sigue aceptando de 14 a 16 dígitos.
- El registro agrega el campo obligatorio "Celular" con la ayuda "10 dígitos, por ejemplo 0991234567", y guarda `tel` y `passHash`.
- El perfil queda con dos formularios. "Datos personales" incluye nombre, apellido, correo, celular y fecha de nacimiento. Si el correo cambia, aparece el campo obligatorio "Contraseña actual" y sin él no se guarda. "Cambiar contraseña" pide la contraseña actual, la nueva con `data-rule="pass"` y su confirmación con `data-match`. Si la actual no coincide, el error va en ese campo y dice "La contraseña actual no es correcta."

- [ ] **Step 1: Escribir las pruebas**

```js
test('tarjeta y celular con límites', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { state.accounts['a@b.com'] = newAccount('Ana','Ruiz','a@b.com'); state.user='a@b.com'; save(); });
  await page.goto('perfil.html');
  await page.locator('#pf-tel').fill('');
  await page.locator('#pf-tel').evaluate((el) => { const dt = new DataTransfer(); dt.setData('text/plain','099 123 4567'); el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt, bubbles:true})); });
  await expect(page.locator('#pf-tel')).toHaveValue('0991234567');
  const r = await page.evaluate(() => [formatCard('4111-1111-1111-1111 9999'), soloDigitos('09912345678', 10)]);
  expect(r).toEqual(['4111 1111 1111 1111', '0991234567']);
});
test('cambiar correo exige contraseña actual', async ({ page }) => {
  await page.goto('registro.html');
  await page.fill('#rg-nombre','Ana Ruiz'); await page.fill('#rg-email','a@b.com'); await page.fill('#rg-tel','0991234567');
  await page.fill('#rg-pass','clave1234'); await page.fill('#rg-pass2','clave1234'); await page.click('button[type=submit]');
  await page.goto('perfil.html');
  await page.fill('#pf-email','nuevo@b.com');
  await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#err-pf-pass')).toBeVisible();
  await page.fill('#pf-pass','otra-clave'); await page.click('#pf-form button[type=submit]');
  await expect(page.locator('#err-pf-pass')).toHaveText('La contraseña actual no es correcta.');
  await page.fill('#pf-pass','clave1234'); await page.click('#pf-form button[type=submit]');
  expect(await page.evaluate(() => state.user)).toBe('nuevo@b.com');
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Limitar teléfono y tarjeta, y mejorar perfil y registro`.

---

### Task 8: Envío gratis, quitar con deshacer y confirmación

**Files:**
- Modify: `js/comun.js` (`summaryRows`, `toast` con acción, `entregaHTML`), `js/paginas/carrito.js`, `js/paginas/checkout.js`, `js/paginas/confirmacion.js`
- Create: `tests/e2e/compra.spec.js`

**Interfaces:**
- Produces: `toast(msg, {type, link, action:[etiqueta, fn]})`. Con `action` se dibuja un botón que ejecuta `fn` y cierra el aviso, y el aviso dura 8 segundos.

Lo que cambia:
- **Resumen con envío gratis.** Cuando `t.entrega==='envio'` y `t.sub >= FREE_SHIP`, el resumen muestra "Tu envío es gratis porque tu compra llega a $60.00. Recuerda que el envío gratis aplica solo en compras desde $60.00."
- **Quitar del carrito.** Quita la línea sin diálogo, mueve el foco al título del carrito y muestra el aviso "X se quitó del carrito." con el botón "Deshacer", que devuelve la línea a su lugar con la misma cantidad.
- **Guía en la confirmación y en Mis pedidos.** Se explica con una lista ordenada de tres pasos: "Copia tu número de guía con el botón Copiar.", "Abre la página de rastreo de Servientrega." y "Pega el número y consulta dónde está tu pedido." Debajo va la nota de que el rastreo se activa cuando el pedido sale del local.
- **Botones de la confirmación.** Siempre "Ver mis pedidos" (dorado) y "Seguir comprando". Desaparece "Crear cuenta para seguir tu pedido".
- **Aviso del correo.** La confirmación agrega "Te enviamos la confirmación del pedido a correo." en el texto principal.

- [ ] **Step 1: Escribir las pruebas**

```js
test('aviso de envío gratis desde 60', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { addToCart('sauvage','frasco',50,1,true); });
  await page.goto('carrito.html');
  await expect(page.getByText('el envío gratis aplica solo en compras desde $60.00')).toBeVisible();
});
test('quitar y deshacer', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => addToCart('khamrah','frasco',50,2,true));
  await page.goto('carrito.html');
  await page.getByRole('button', { name: /Quitar Khamrah/ }).click();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await page.evaluate(() => state.cart[0].qty)).toBe(2);
});
test('confirmación sin crear cuenta y con pasos de la guía', async ({ page }) => {
  await page.goto('index.html');
  await page.evaluate(() => { state.accounts['a@b.com']=newAccount('Ana','Ruiz','a@b.com'); state.user='a@b.com';
    state.lastOrder={num:'MK-1001',fecha:'18 oct 2026',estado:'En preparación',metodo:'Tarjeta',items:[{nombre:'Khamrah',desc:'Frasco 50 ml',qty:1,unit:27.2}],total:30.7,email:'a@b.com',entrega:'envio',guia:'426896023910',envio:{nombre:'Ana Ruiz',dir:'Av. Amazonas',ciudad:'Quito',tel:'0991234567'}}; save(); });
  await page.goto('confirmacion.html');
  await expect(page.getByText('Crear cuenta para seguir tu pedido')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver mis pedidos' })).toBeVisible();
  await expect(page.locator('ol li', { hasText: 'Pega el número' })).toBeVisible();
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Aviso de envío gratis, deshacer y guía explicada`.

---

### Task 9: Responsivo, accesibilidad y 404 útil

**Files:**
- Modify: `js/tailwind.config.js`, `tests/soporte/tailwind.cjs` (si hace falta), `plantillas/encabezado.html` (lista de sugerencias), `404.html`, `js/comun.js`
- Create: `tests/e2e/accesibilidad.spec.js`
- Create: `tests/capturas.mjs` (toma capturas de inicio, catálogo, ficha, carrito, checkout y confirmación en 375, 768, 1024 y 1366 px y las guarda en `test-results/capturas/`)

Lo que cambia:
- **Puntos de ruptura.** Quedan `laptop: {max:'1180px'}`, `tablet: {max:'1023px'}` y `movil: {max:'767px'}`, para que coincidan con los tres rangos de IHC. Se revisan las capturas de los cuatro anchos y se corrigen los cortes que aparezcan.
- **Reglas base del plugin.** `html {scroll-padding-top: 120px}`, para que el encabezado fijo no tape el foco (WCAG 2.4.11). Y `@media (prefers-reduced-motion: reduce)` con duraciones de animación y transición de 0.01 ms y `scroll-behavior: auto`.
- **Buscador con sugerencias.** El buscador del encabezado usa un `<datalist id="sugerencias">` que `comun.js` llena con los nombres y las marcas de `PRODUCTS`, sin repetir.
- **404 útil.** Agrega un buscador propio con etiqueta visible y enlaces a Ofertas, Decants, Novedades, Ayuda y "Ver todos los perfumes", además de los botones actuales.

- [ ] **Step 1: Escribir las pruebas**

```js
test('objetivos táctiles de al menos 24 px', async ({ page }) => {
  for (const url of ['index.html','catalogo.html','producto.html?id=khamrah','producto.html?id=khamrah&formato=decant']) {
    await page.goto(url);
    const chicos = await page.evaluate(() => [...document.querySelectorAll('button, input, select, [role=button]')]
      .filter(el => el.offsetParent && !el.closest('p, li > span'))
      .map(el => [el.outerHTML.slice(0,80), (el.closest('label') || el).getBoundingClientRect()])
      .filter(([,r]) => r.width < 24 || r.height < 24).map(([h]) => h));
    expect(chicos, url).toEqual([]);
  }
});
test('el foco no queda debajo del encabezado', async ({ page }) => {
  await page.goto('catalogo.html');
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const [top, bottom] = await page.evaluate(() => [document.activeElement.getBoundingClientRect().top, document.querySelector('header').getBoundingClientRect().bottom]);
    if (await page.evaluate(() => !document.activeElement.closest('header'))) expect(top).toBeGreaterThanOrEqual(bottom - 1);
  }
});
test('404 con buscador y enlaces', async ({ page }) => {
  await page.goto('404.html');
  await expect(page.getByRole('main').getByRole('searchbox')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Ver todos los perfumes' })).toBeVisible();
});
```

- [ ] **Step 2: Correrlas y ver que fallan.**
- [ ] **Step 3: Implementar** los cambios de la lista anterior y luego correr `node tests/capturas.mjs`. Se revisa cada captura con la herramienta Read y se corrigen los desbordes, los textos cortados y los elementos encimados.
- [ ] **Step 4: Correr** `npm test` en los tres proyectos y ver todo en PASS.
- [ ] **Step 5: Commit** con el mensaje `Ajustar puntos de ruptura y accesibilidad`.

---

### Task 10: Prueba de aceptación, compra completa solo con teclado

**Files:**
- Create: `tests/e2e/teclado.spec.js`
- Modify: cualquier archivo donde la prueba encuentre un control que el teclado no alcanza

**Interfaces:**
- Produces: la función de prueba `tabHasta(page, predicado, max=120)`, que presiona Tab hasta que `predicado(document.activeElement)` sea verdadero y falla si no lo logra.

- [ ] **Step 1: Escribir la prueba**

El recorrido es inicio, Enter en la tarjeta de un perfume, Tab hasta "Agregar al carrito" y Enter, Tab hasta el botón del carrito y Enter, Tab hasta "Ir al checkout" y Enter. Luego la página de login, donde se escribe correo y contraseña con `keyboard.type` y se envía con Enter. Al volver al checkout se completan celular, ciudad (con las flechas en el `select`), dirección, entrega con las flechas en el grupo de radios y pago con tarjeta. Por último se envía con Enter, se escriben los datos de la tarjeta y se presiona Enter. Se espera la URL `confirmacion.html` y el título "¡Pedido confirmado!".

En ningún momento se usan `click`, `fill` ni `focus`. Se corre en los tres proyectos.

- [ ] **Step 2: Correrla** con `npx playwright test tests/e2e/teclado.spec.js` en los tres proyectos y corregir todo control que no se alcance, que no responda a Enter o Espacio, o que pierda el foco.
- [ ] **Step 3: Correr la suite completa** con `npm test`. Se espera todo en PASS en los tres proyectos y `page.erroresConsola` vacío.
- [ ] **Step 4: Commit** con el mensaje `Agregar prueba de compra completa con teclado`.
