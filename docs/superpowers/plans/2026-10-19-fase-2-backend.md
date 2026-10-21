# Fase 2, base de datos, API y sesión. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cuentas, favoritos, direcciones, carrito con sesión y pedidos de Maison Kage vivan en PostgreSQL detrás de una API Express, sin cambiar el diseño ni la accesibilidad de la Fase 1.

**Architecture:** Express sirve las páginas y la API desde un solo proceso. Las páginas siguen siendo HTML con JavaScript del navegador. Reciben el catálogo y el estado de la sesión como scripts que el servidor arma en cada visita (`js/productos.js` y `js/sesion.js`), y escriben con `fetch` a través de `js/api.js`. Las reglas de dinero, stock y seguridad se deciden en el servidor y en la base.

**Tech Stack:** Node 20 o superior, Express 5, pg, bcryptjs, helmet, express-rate-limit, nodemailer, dotenv. Pruebas con `node --test` para la API y Playwright para el sitio. PostgreSQL 14 o superior.

**Spec:** `docs/superpowers/specs/2026-10-19-fase-2-backend-design.md`, que continúa `docs/superpowers/specs/2026-10-18-alta-fidelidad-design.md`.

## Global Constraints

- Commits a nombre de `Rodrigo Cordero <rodrigocorderp@gmail.com>`, **sin** línea `Co-Authored-By` ni ninguna atribución a Claude, aunque el entorno lo sugiera.
- Comentarios de código y textos visibles en español, con la voz de Rodrigo y **sin rayas largas, punto y coma ni dos puntos** en la prosa.
- Todo error de la API responde `{ "error": "<mensaje en español que la página muestra tal cual>" }`. Nunca se envía una traza ni un mensaje de PostgreSQL crudo, salvo los que lanzan los triggers con `ERRCODE = 'P0001'`, que ya están en español.
- Sin dependencias que compilen código nativo (por eso `bcryptjs` y no `bcrypt`). El proyecto se usa en Windows.
- Los scripts de npm no usan la sintaxis `VAR=valor comando`. El modo de pruebas se activa con el argumento `--prueba`.
- `backend/` es ESM (ya tiene `backend/package.json` con `"type": "module"`). `tests/`, `playwright.config.js` y `herramientas/*.cjs` siguen en CommonJS.
- Las convenciones de BD2 del script SQL no cambian. Si una tarea necesita tocar `database/maisonkage.sql`, se cambia `herramientas/generar-sql.mjs` y se regenera con `npm run sql`.
- Valores fijos que vienen de la especificación. Envío $3.50, gratis desde $60, máximo 10 decants por tamaño y perfume, sesión de 7 días, código de recuperación de 30 minutos, bcrypt costo 12, contraseña de 8 caracteres o más, 5 intentos cada 15 minutos, teléfono `^09[0-9]{8}$`.
- Mensajes exactos que ya fijó la especificación. "Si el correo tiene una cuenta, te enviamos un enlace", "Demasiados intentos, espera unos minutos", "No hay stock suficiente de <perfume> <ml> ml" (del trigger).
- El orden de tabulación, los textos y las clases de la Fase 1 no cambian salvo donde una tarea lo diga.

## Review Focus

1. **Lectura del estado de sesión desde otra web.** Una página ajena que incluya `<script src="https://tienda/js/sesion.js">` no debe recibir datos de la cuenta. Con `SameSite=Lax` la cookie no viaja en esa petición, y además el servidor responde la versión sin sesión cuando `Sec-Fetch-Site` es `cross-site`. Prueba en la Tarea 7.
2. **Correo escrito con mayúsculas o espacios.** Registrarse como `" Ana@Correo.com "` y luego entrar como `ana@correo.com` funciona, y registrar `ANA@correo.com` después da "Ya existe una cuenta con este correo". Prueba en la Tarea 2.
3. **Carrito anónimo con basura al iniciar sesión.** Fusionar líneas de perfumes que no existen, cantidades en texto, negativas o mayores al stock nunca da error 500. Esas líneas se descartan o se bajan al máximo. Prueba en la Tarea 5.
4. **Pagar dos veces el mismo carrito** (doble clic o dos pestañas). El segundo `POST /api/pedidos` responde 400 "Tu carrito está vacío" y no crea un segundo pedido. Prueba en la Tarea 6.
5. **Base de datos caída.** La API responde un mensaje claro sin detalles internos, y las páginas muestran "No pudimos cargar los perfumes" con un botón Reintentar en vez de quedar en blanco. Pruebas en las Tareas 1 y 10.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `backend/config.js` | Carga `.env` y aplica el modo `--prueba` |
| `backend/app.js` | `crearApp(opciones)` arma Express con middleware y rutas, sin escuchar |
| `backend/servidor.js` | Solo lee la configuración y escucha |
| `backend/bd.js` | `pool` y `transaccion(fn)` |
| `backend/reglas.js` | Constantes y validaciones compartidas por todas las rutas |
| `backend/seguridad.js` | helmet, CSRF de doble envío y limitador de intentos |
| `backend/sesion.js` | Crear, leer y cerrar sesiones |
| `backend/correo.js` | Envío por Gmail, consola o bandeja de pruebas |
| `backend/plantillas-correo.js` | Texto y HTML de los correos |
| `backend/servicios/carrito.js` | Traduce y valida líneas del carrito contra la base |
| `backend/servicios/pedidos.js` | Transacción del pedido y lectura con la forma que usa el sitio |
| `backend/rutas/*.js` | Una ruta por área (`productos`, `cuenta`, `recuperar`, `direcciones`, `favoritos`, `carrito`, `pedidos`, `sitio`, `prueba`) |
| `herramientas/preparar-bd.mjs` | Crea la base si no existe y ejecuta `maisonkage.sql` |
| `herramientas/catalogo.js` | Datos de origen de los 70 perfumes, solo para generar el SQL. No se publica |
| `js/api.js` | `api(metodo, ruta, cuerpo)` con CSRF y errores |
| `js/estado.js` | Solo el carrito sin sesión en `sessionStorage` |
| `tests/api/ayuda.mjs` | Levanta la app en un puerto libre y da un cliente con cookies |
| `tests/api/*.test.mjs` | Pruebas de cada área de la API |
| `tests/soporte/fixtures.js` | Ayudas de Playwright para crear cuentas, sesiones y carritos por la API |
| `tests/soporte/preparar.cjs` | `globalSetup` de Playwright que recrea la base de pruebas |

---

### Task 1: Separar la app, base de pruebas y primeras pruebas de la API

**Files:**
- Create: `backend/config.js`, `backend/app.js`, `backend/reglas.js`, `backend/rutas/sitio.js`, `herramientas/preparar-bd.mjs`, `tests/api/ayuda.mjs`, `tests/api/productos.test.mjs`, `tests/soporte/preparar.cjs`
- Modify: `backend/servidor.js`, `backend/bd.js`, `backend/rutas/productos.js`, `playwright.config.js`, `package.json`, `.env.ejemplo`

**Interfaces:**
- Produces: `cargarConfig(argv) -> { puerto, nodeEnv, bd:{host,port,database,user,password}, limiteIntentos, gmail:{usuario,claveApp}, urlBase }`. Con `--prueba` fuerza `database = 'maisonkage_test'`, `puerto = 4174`, `nodeEnv = 'test'`, `limiteIntentos = 1000`.
- Produces: `crearApp({ pool, config }) -> express.Application`.
- Produces: `crearPool(configBd) -> pg.Pool` y `transaccion(pool, fn: (cliente) => Promise<T>) -> Promise<T>` con `BEGIN`, `COMMIT` y `ROLLBACK` si `fn` lanza.
- Produces: `prepararBd(configBd)` exportada por `herramientas/preparar-bd.mjs`. Se conecta a la base `postgres`, crea la de destino si no existe y ejecuta `database/maisonkage.sql` completo en una sola consulta.
- Produces: `iniciarApp(opciones?) -> Promise<{ base: string, cerrar(): Promise<void>, pool }>`. `opciones` se mezcla sobre la configuración de `--prueba`, por ejemplo `{ limiteIntentos: 5 }` o `{ bd: { database: 'no_existe_mk' } }`. y `cliente(base) -> { get, post, put, patch, del }` en `tests/api/ayuda.mjs`. Cada método devuelve `{ status, cuerpo }`, guarda las cookies y manda `X-CSRF` con el valor de la cookie `mk_csrf`.

- [ ] **Step 1: Write the failing tests** en `tests/api/productos.test.mjs`
  - `GET /api/productos` responde 200 con 70 elementos, y el de `khamrah` tiene `pres.length === 5`.
  - `GET /api/productos/khamrah` responde 200 con `nombre === 'Khamrah'`.
  - `GET /api/productos/no-existe` responde 404 con `error === 'No encontramos ese perfume.'`.
  - `GET /.env`, `/backend/app.js`, `/database/maisonkage.sql`, `/tests/.tw.css` y `/package.json` responden 404.
  - Una consulta sobre la base de pruebas devuelve 70 en `Producto`, y ninguna de las 27 categorías de la consulta de la sección 6 de `maisonkage.sql` tiene menos de 10 perfumes.
  - Con `iniciarApp({ bd: { database: 'no_existe_mk' } })`, `GET /api/productos` responde 503 con `error === 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.'` y el cuerpo no contiene `postgres` ni `at `.

- [ ] **Step 2: Run** `node --test tests/api/` y confirmar que falla porque `tests/api/ayuda.mjs` y `backend/app.js` no existen.

- [ ] **Step 3: Implement** la separación. `servidor.js` queda en `cargarConfig(process.argv)`, `crearPool`, `crearApp(...).listen`. Las rutas de páginas, `js/productos.js`, `/js`, `/source` y `/plantillas` pasan a `backend/rutas/sitio.js`. El manejador de errores de `app.js` responde 503 con el mensaje anterior cuando el error tiene un código de conexión de pg (`ECONNREFUSED`, `3D000`, `28P01`, `57P03`), 400 con `err.message` cuando `err.code === 'P0001'` o el error es `ErrorUsuario`, y 500 "Algo salió mal. Intenta de nuevo." en cualquier otro caso. Crear `backend/reglas.js` con `class ErrorUsuario extends Error { constructor(mensaje, status = 400) }`. La Tarea 2 completa ese archivo.

- [ ] **Step 4: Configurar los scripts.** En `package.json`, `"start": "node backend/servidor.js"`, `"bd": "node herramientas/preparar-bd.mjs"`, `"bd:prueba": "node herramientas/preparar-bd.mjs --prueba"`, `"test:api": "node herramientas/preparar-bd.mjs --prueba && node --test tests/api/"`, `"test:web": "tailwindcss -c tests/soporte/tailwind.cjs -o tests/.tw.css --minify && playwright test"`, `"test": "npm run test:api && npm run test:web"`. En `playwright.config.js`, `globalSetup: './tests/soporte/preparar.cjs'`, `webServer: { command: 'node backend/servidor.js --prueba', port: 4174, reuseExistingServer: true }` y `baseURL: 'http://localhost:4174/'`. Quitar el servidor de Python.

- [ ] **Step 5: Run** `npm run test:api` y luego `npm run test:web`. Esperado: pasan las pruebas nuevas y las 257 de Playwright.

- [ ] **Step 6: Commit** `"Separar la app del servidor y preparar la base de pruebas"`.

---

### Task 2: Registro, login, logout y perfil en la API

**Files:**
- Create: `backend/seguridad.js`, `backend/sesion.js`, `backend/rutas/cuenta.js`, `tests/api/cuenta.test.mjs`, `tests/api/reglas.test.mjs`
- Modify: `backend/reglas.js`, `backend/app.js`, `package.json` (dependencias `bcryptjs`, `helmet`, `express-rate-limit`)

**Interfaces:**
- Consumes: `crearApp`, `transaccion`, `ErrorUsuario` de la Tarea 1.
- Produces en `backend/reglas.js`: `SHIP = 3.5`, `FREE_SHIP = 60`, `DEC_MAX = 10`, `CIUDADES` (mismo arreglo que `js/datos.js`), `normalizarCorreo(s) -> string` (recorta y pasa a minúsculas), `validarCorreo`, `validarTelefono`, `validarClave`, `validarTexto(valor, nombreCampo, max)`. Cada `validar*` lanza `ErrorUsuario` con el mismo mensaje que muestra hoy el formulario del sitio para ese campo.
- Produces en `backend/sesion.js`: `crearSesion(pool, res, usuId)`, `leerSesion(pool)` (middleware que pone `req.usuario = { id, correo, nombre, apellido, telefono } | null`), `cerrarSesion(pool, req, res)`, `exigirSesion` (middleware que responde 401 "Inicia sesión para continuar.").
- Produces en `backend/seguridad.js`: `cabeceras()` (helmet), `csrf()` y `limitador(maximo)`. `csrf()` crea la cookie `mk_csrf` (32 bytes en hex, `SameSite=Lax`, legible por JavaScript) si falta, y para todo `POST`, `PUT`, `PATCH` y `DELETE` bajo `/api` exige la cabecera `X-CSRF` igual a esa cookie. Si no coincide responde 403 "Tu sesión de seguridad venció. Recarga la página e intenta de nuevo.".
- Produces las rutas `POST /api/registro {nombre, apellido, correo, telefono, clave}`, `POST /api/login {correo, clave}`, `POST /api/logout`, `GET /api/yo`, `PATCH /api/yo {nombre, apellido, telefono, correo, claveActual?}` y `PUT /api/yo/clave {actual, nueva}`. `GET /api/yo` responde `null` sin sesión, o `{ nombre, apellido, correo, telefono }`.

- [ ] **Step 1: Write the failing tests** en `tests/api/cuenta.test.mjs`
  - Registro válido responde 201, deja la cookie `mk_sesion` con `HttpOnly` y `SameSite=Lax`, y `GET /api/yo` devuelve el nombre.
  - En la base, `Usu_clave` empieza con `$2` y no contiene la clave.
  - Registrar `" Ana@Correo.com "` y luego entrar con `ana@correo.com` funciona. Registrar `ANA@correo.com` responde 409 "Ya existe una cuenta con este correo. Inicia sesión.".
  - Login con clave equivocada y con correo inexistente responden el mismo 401 "El correo o la contraseña no son correctos.".
  - Teléfono `0812345678` responde 400 con el mensaje del formulario. Clave de 7 caracteres responde 400.
  - Un `POST` sin `X-CSRF` responde 403.
  - Logout borra la fila de `Sesion`, y la cookie anterior ya no da usuario en `GET /api/yo`.
  - Cambiar el correo sin `claveActual` o con una equivocada responde 400 "La contraseña actual no es correcta.". Con la correcta cambia y el login con el correo nuevo funciona.
  - `PUT /api/yo/clave` con la actual equivocada responde 400. Con la correcta, el login con la nueva funciona.
  - Con `iniciarApp({ limiteIntentos: 5 })`, el sexto `POST /api/login` en 15 minutos responde 429 "Demasiados intentos, espera unos minutos".
  - En `tests/api/reglas.test.mjs`, `SHIP`, `FREE_SHIP`, `DEC_MAX` y `CIUDADES` son iguales a los de `js/datos.js` (cargado con `vm`).

- [ ] **Step 2: Run** `npm run test:api` y confirmar que fallan por rutas inexistentes (404).

- [ ] **Step 3: Implement.** Sesión con `crypto.randomBytes(32)`, guardando en `Ses_token_hash` el SHA-256 en hex y en la cookie el código. `Secure` solo cuando `req.secure`. Vence a los 7 días. bcryptjs con costo 12. El limitador se aplica a `/api/login`, `/api/registro` y `/api/recuperar`. `helmet` con `contentSecurityPolicy` permitiendo `script-src 'self' https://cdn.tailwindcss.com` y `style-src 'self' 'unsafe-inline'`. Al cambiar el correo se cierran las demás sesiones de esa cuenta.

- [ ] **Step 4: Run** `npm run test:api` y `npm run test:web`. Esperado: todo pasa. Si helmet bloquea los `onerror` en línea de las imágenes (`index.html:95` y `js/comun.js:73`), reemplazarlos por un solo `document.addEventListener('error', ..., true)` en `js/comun.js` que llame a `fotoError(img)`, y agregar a `tests/e2e/humo.spec.js` que no haya errores de CSP en consola.

- [ ] **Step 5: Commit** `"Agregar cuentas y sesiones con bcrypt y CSRF"`.

---

### Task 3: Correo y recuperar contraseña

**Files:**
- Create: `backend/correo.js`, `backend/plantillas-correo.js`, `backend/rutas/recuperar.js`, `backend/rutas/prueba.js`, `tests/api/recuperar.test.mjs`
- Modify: `backend/app.js`, `.env.ejemplo` (`GMAIL_USUARIO`, `GMAIL_CLAVE_APP`, `URL_BASE`), `package.json` (`nodemailer`)

**Interfaces:**
- Produces: `crearCorreo(config) -> { enviar({ para, asunto, texto, html }): Promise<void>, bandeja: Array }`. Con `nodeEnv === 'test'` solo guarda en `bandeja`. Sin `gmail.claveApp` escribe en consola. En otro caso usa el SMTP de Gmail. Nunca lanza, registra el error y sigue.
- Produces: `correoRecuperar(enlace) -> { asunto, texto, html }` y `correoPedido(pedido) -> { asunto, texto, html }` (la forma de `pedido` la define la Tarea 6).
- Produces: `POST /api/recuperar {correo}` responde siempre 200 `{ mensaje: 'Si el correo tiene una cuenta, te enviamos un enlace' }`. `POST /api/recuperar/:codigo {clave}` responde 200 o 400 "El enlace venció o ya se usó. Pide uno nuevo.".
- Produces: `GET /api/_prueba/correos?para=<correo>` solo con `nodeEnv === 'test'`, que devuelve los correos de la bandeja para ese destinatario. En otro modo responde 404.

- [ ] **Step 1: Write the failing tests** en `tests/api/recuperar.test.mjs`
  - Pedir con un correo registrado y con uno inexistente responde el mismo 200 y el mismo cuerpo. Solo el registrado recibe un correo.
  - El correo contiene un enlace `URL_BASE + /recuperar.html?codigo=<64 hex>` y el texto "vence en 30 minutos".
  - En la base, `Rec_token_hash` no es igual al código del enlace.
  - Usar el código cambia la clave, el login con la nueva funciona y las sesiones anteriores de esa cuenta dejan de valer.
  - Usarlo una segunda vez responde 400. Un código con `Rec_vence` en el pasado (actualizado por SQL en la prueba) responde 400.
  - Una clave de 7 caracteres responde 400 sin gastar el código.

- [ ] **Step 2: Run** `npm run test:api` y confirmar que fallan.

- [ ] **Step 3: Implement.** El código usa 32 bytes y se guarda como SHA-256. `correoRecuperar` incluye el enlace, el aviso de vencimiento y "Si no pediste este cambio, ignora este correo".

- [ ] **Step 4: Run** `npm run test:api`. Esperado: pasa.

- [ ] **Step 5: Commit** `"Agregar recuperación de contraseña por correo"`.

---

### Task 4: Direcciones y favoritos en la API

**Files:**
- Create: `backend/rutas/direcciones.js`, `backend/rutas/favoritos.js`, `tests/api/direcciones.test.mjs`, `tests/api/favoritos.test.mjs`
- Modify: `backend/app.js`

**Interfaces:**
- Consumes: `exigirSesion`, validaciones de `reglas.js`.
- Produces: una dirección se representa como `{ id, alias, dir, ciudad, ref, tel, principal }`, la misma forma que usa hoy `js/paginas/direcciones.js`. `GET /api/direcciones` devuelve la lista con la principal primero. `POST` crea la dirección y la marca principal si es la primera. `PATCH /:id {principal:true}` la vuelve principal. `DELETE /:id` la borra y, si era la principal, la siguiente más antigua pasa a serlo.
- Produces: `GET /api/favoritos` devuelve una lista de slugs. `PUT /api/favoritos/:slug` y `DELETE /api/favoritos/:slug` son idempotentes y responden la lista actualizada.

- [ ] **Step 1: Write the failing tests**
  - Sin sesión, todas las rutas responden 401.
  - La primera dirección queda principal. Marcar otra deja una sola principal (lo hace el trigger).
  - Borrar la principal deja principal a la siguiente.
  - Ciudad fuera de `CIUDADES` o teléfono inválido responden 400.
  - Un usuario no puede borrar ni cambiar la dirección de otro, y recibe 404 "No encontramos esa dirección.".
  - `PUT /api/favoritos/khamrah` dos veces deja un solo favorito. Un slug inexistente responde 404.

- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement** con consultas filtradas siempre por `Usu_id = req.usuario.id`.
- [ ] **Step 4: Run** `npm run test:api`. Esperado: pasa.
- [ ] **Step 5: Commit** `"Agregar direcciones y favoritos en la API"`.

---

### Task 5: Carrito en la API

**Files:**
- Create: `backend/servicios/carrito.js`, `backend/rutas/carrito.js`, `tests/api/carrito.test.mjs`
- Modify: `backend/app.js`

**Interfaces:**
- Produces: `sanearLineas(cliente, lineas) -> Promise<Array<{ id, kind, ml, qty, preId }>>`. Descarta líneas sin presentación, convierte `qty` con `Math.floor(Number(qty))`, descarta las que quedan en 0 o menos, junta duplicadas y baja cada cantidad a `min(stock, kind === 'decant' ? DEC_MAX : Infinity)`. Nunca lanza por datos del navegador.
- Produces: `GET /api/carrito` devuelve `[{ id, kind, ml, qty }]`. `PUT /api/carrito {lineas}` reemplaza todo el carrito con las líneas saneadas y devuelve el resultado. `POST /api/carrito/fusionar {lineas}` suma esas líneas a las guardadas, sanea y devuelve el resultado.

- [ ] **Step 1: Write the failing tests**
  - `PUT` con `[{id:'khamrah',kind:'frasco',ml:50,qty:99}]` devuelve `qty: 6`.
  - `PUT` con 50 decants de 2 ml devuelve `qty: 10`.
  - Fusionar `[{id:'no-existe',...}, {id:'asad',kind:'frasco',ml:50,qty:'2'}, {id:'yara',kind:'frasco',ml:50,qty:-1}]` responde 200 con solo la línea de asad y `qty: 2`.
  - Fusionar 3 decants de khamrah 5 ml sobre un carrito que ya tiene 9 deja 10.
  - `lineas` que no es arreglo responde 400 "No pudimos leer tu carrito.".
  - Sin sesión responde 401.

- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement.** El `Carrito` del usuario se crea al primer uso.
- [ ] **Step 4: Run** `npm run test:api`. Esperado: pasa.
- [ ] **Step 5: Commit** `"Agregar el carrito con sesión en la API"`.

---

### Task 6: Pedidos con transacción, correo y concurrencia

**Files:**
- Create: `backend/servicios/pedidos.js`, `backend/rutas/pedidos.js`, `tests/api/pedidos.test.mjs`
- Modify: `backend/app.js`, `backend/plantillas-correo.js`

**Interfaces:**
- Consumes: `sanearLineas`, `transaccion`, `crearCorreo().enviar`, `correoPedido`.
- Produces: `POST /api/pedidos {nombre, correo, telefono, entrega:'envio'|'retiro', ciudad?, dir?, ref?, metodo:'tarjeta'|'deuna', ultimos4?, verificacion?}` responde 201 con el pedido.
- Produces la forma del pedido, igual a la que hoy guarda `js/paginas/checkout.js` para que `confirmacion.js`, `pedidos.js` y `entregaHTML()` no cambien su lógica.
  `{ num, fecha (ISO), estado, metodo: 'Tarjeta'|'Deuna', items: [{ nombre, desc, qty, unit }], sub, ship, total, email, entrega, guia: string|null, envio: { nombre, dir, ciudad, ref, tel } }`, con `desc` como `'Frasco 50 ml'` o `'Decant 5 ml'` y `estado` tomado de `Vista_pedido`.
- Produces: `GET /api/pedidos` (los del usuario, del más nuevo al más viejo) y `GET /api/pedidos/:numero` (404 "No encontramos ese pedido." si no es suyo).

- [ ] **Step 1: Write the failing tests**
  - Con el carrito `khamrah frasco 50 x1` y entrega a domicilio, el pedido tiene `sub: 27.2` (oferta del 20 % sobre 34), `ship: 3.5`, `total: 30.7`, `num` con el patrón `^MK-\d{6}$`, y el stock baja de 6 a 5.
  - Un cuerpo con `precio`, `total` o `items` inventados no cambia el total cobrado.
  - Con subtotal desde 60 o con retiro, `ship: 0`. En retiro, `guia: null` y `envio.dir` vacío.
  - Con tarjeta, `Pago.Pag_ultimos4` es `'4242'` y en ninguna columna aparece un número de 16 dígitos. `ultimos4` con letras responde 400.
  - El carrito queda vacío después del pedido. Un segundo `POST /api/pedidos` responde 400 "Tu carrito está vacío.".
  - Con `metodo:'deuna'` y `verificacion:true`, `estado === 'Pago en verificación'`.
  - **Concurrencia.** Dos usuarios con `khamrah frasco 100 x1` en el carrito y el stock de esa presentación puesto en 1 por SQL. Los dos `POST /api/pedidos` se lanzan con `Promise.all`. Uno responde 201, el otro 400 con "No hay stock suficiente de Khamrah 100 ml" o "Solo quedan 0 ...", y el stock final es 0.
  - Se agrega un correo a la bandeja para `correo` con el número del pedido, el total y, en envío, la guía y los tres pasos para rastrearla.
  - `GET /api/pedidos/:numero` de otro usuario responde 404.
  - Como en la Fase 1, después del primer pedido con envío la cuenta sin teléfono ni direcciones queda con `Usu_telefono` igual al del pedido y una `Direccion` principal con alias "Principal". Si ya tenía teléfono o direcciones, no se cambian.

- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement** `crearPedido(pool, usuario, datos) -> Promise<pedido>` en una sola `transaccion`, en este orden. Leer el carrito, `SELECT ... FROM Presentacion WHERE Pre_id = ANY($1) FOR UPDATE`, verificar cada línea y lanzar `ErrorUsuario('Solo quedan N <tipo> de <perfume> <ml> ml.')` si no alcanza, insertar `Pedido`, `PedidoItem` con `precioFinal` calculado en el servidor, `Pago`, `Envio` con una guía de 12 dígitos al azar si es envío (12 y no 10 como dice la especificación, porque `fmtGuia()` y las pruebas de la Fase 1 ya usan 12), guardar teléfono y primera dirección si faltan, borrar las líneas del carrito. Enviar el correo después del `COMMIT`.
- [ ] **Step 4: Run** `npm run test:api`. Esperado: pasa, y la prueba de concurrencia pasa 5 veces seguidas (`node --test --test-name-pattern=Concurrencia tests/api/` repetido).
- [ ] **Step 5: Commit** `"Agregar pedidos con transacción y correo de confirmación"`.

---

### Task 7: El sitio lee la sesión del servidor (cuenta, login, registro, logout, favoritos)

**Files:**
- Create: `js/api.js`
- Modify: `backend/rutas/sitio.js` (ruta `/js/sesion.js`), `js/estado.js`, `js/comun.js`, `js/paginas/login.js`, `js/paginas/registro.js`, `js/paginas/favoritos.js`, `plantillas/*.html` y las 16 páginas (con `herramientas/maquetar.mjs` si aplica) para cargar `js/sesion.js` y `js/api.js` después de `js/datos.js`, `tests/soporte/fixtures.js`, `tests/e2e/sesion.spec.js`, `tests/e2e/campos.spec.js`, `tests/e2e/humo.spec.js`, `tests/e2e/revision.spec.js`, `tests/e2e/compra.spec.js`
- Test: `tests/e2e/sesion.spec.js`, `tests/api/sitio.test.mjs`

**Interfaces:**
- Consumes: las rutas de cuenta, favoritos y direcciones.
- Produces: `/js/sesion.js` responde con `Cache-Control: no-store` el script `const SESION = { usuario: {nombre, apellido, correo, telefono} | null, favoritos: [slug], direcciones: [direccion] };`. Si `Sec-Fetch-Site` es `cross-site`, responde la versión sin sesión.
- Produces en `js/api.js`: `api(metodo, ruta, cuerpo?) -> Promise<any>`. Agrega `X-CSRF` leído de `document.cookie`, lanza `Error(cuerpo.error)` cuando la respuesta no es 2xx y `Error('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.')` si `fetch` falla.
- Produces en `js/estado.js`: `state = { cart, favs, user, orders, lastOrder, orderSeq }` donde `user` y `favs` vienen de `SESION`. `save()` guarda solo `cart`, `orders`, `lastOrder` y `orderSeq` en `sessionStorage` (los pedidos pasan a la base en la Tarea 9). Desaparecen `accounts`, `hashPass`, `passOk` y `newAccount`.
- Produces: `currentUser()` devuelve `SESION.usuario` con `email` como alias de `correo`, `tel` como alias de `telefono` y `addresses` como `SESION.direcciones`, para que `checkout.js` y `perfil.js` sigan leyendo los mismos nombres.
- Produces en `tests/soporte/fixtures.js`: `cuentaNueva(page, datos?) -> Promise<{ correo, clave }>` registra por la API con un correo único (`ana+<aleatorio>@correo.com`) usando `page.request`, que comparte las cookies con la página. También `entrar(page, correo, clave)`.

- [ ] **Step 1: Write the failing tests**
  - En `tests/api/sitio.test.mjs`, `/js/sesion.js` con sesión contiene el nombre y con `Sec-Fetch-Site: cross-site` contiene `usuario: null`.
  - En `tests/e2e/sesion.spec.js`, crear cuenta desde `registro.html` deja "Hola, Ana" en el menú, y al recargar sigue la sesión.
  - El login con clave equivocada muestra "El correo o la contraseña no son correctos." en `#err-lg-pass`.
  - Guardar un favorito con el corazón y abrir la página en otra pestaña del mismo contexto muestra el corazón marcado.
  - Cerrar sesión desde el menú y recargar muestra "Bienvenido a Maison Kage".
  - El favorito pendiente del aviso del corazón se guarda al volver del login (la prueba que ya existe, ahora con `cuentaNueva`).

- [ ] **Step 2: Run** `npm run test:web -- sesion` y confirmar que fallan.

- [ ] **Step 3: Implement.** El login deja de crear cuentas automáticamente. Si el correo no existe se muestra el mismo mensaje que con la clave equivocada, y el enlace "Crear cuenta" sigue debajo. Registro, login, logout, favoritos y favorito pendiente usan `api()`. Después de entrar o registrarse, la página navega a `safeNext(next)` y con eso `js/sesion.js` trae los datos nuevos. Si el `api()` del favorito falla, el corazón vuelve a su estado anterior y se muestra el error con `toast(..., {type:'error'})`.

- [ ] **Step 4: Migrar las pruebas** que escriben `state.accounts`, `state.user` o llaman `newAccount` para que usen `cuentaNueva`. Run `npm run test:web`. Esperado: todo pasa.

- [ ] **Step 5: Commit** `"Leer la sesión y los favoritos desde el servidor"`.

---

### Task 8: Perfil, direcciones y recuperar contraseña en el sitio

**Files:**
- Modify: `js/paginas/perfil.js`, `js/paginas/direcciones.js`, `js/paginas/recuperar.js`, `recuperar.html`, `tests/e2e/campos.spec.js`
- Test: `tests/e2e/cuenta.spec.js` (nuevo)

**Interfaces:**
- Consumes: `api()`, `currentUser()`, `GET /api/_prueba/correos`.
- Produces: `recuperar.html?codigo=<hex>` muestra el formulario de clave nueva (`#rc-nueva`, `#rc-repetir`) en lugar del de correo.
- Produces: Direcciones muestra "Cargando tus direcciones…" mientras espera y, si la API falla, el mensaje con un botón "Reintentar".

- [ ] **Step 1: Write the failing tests** en `tests/e2e/cuenta.spec.js`
  - Cambiar el nombre en el perfil y recargar muestra el nombre nuevo.
  - Cambiar el correo con la clave actual equivocada muestra "La contraseña actual no es correcta." en `#err-pf-pass`.
  - Agregar dos direcciones, marcar la segunda como principal y recargar muestra "Principal" solo en la segunda.
  - Recuperar completo. Pedir el enlace, leer el correo con `page.request.get('/api/_prueba/correos?para=...')`, abrir el enlace, poner la clave nueva dos veces, ver "Tu contraseña se cambió. Ya puedes iniciar sesión." y entrar con la nueva.
  - Las dos claves distintas muestran "Las contraseñas no coinciden." sin llamar a la API.
  - Con `page.route('**/api/direcciones', r => r.fulfill({ status: 503, ... }))`, Direcciones muestra el error y el botón "Reintentar".
- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement.** Después de guardar en el perfil o en direcciones se vuelve a pedir `GET /api/yo` o `GET /api/direcciones` y se redibuja, sin recargar la página, conservando el foco donde lo deja hoy la Fase 1. Mientras espera la respuesta, el botón de enviar queda con `aria-disabled="true"` y el texto "Guardando…".
- [ ] **Step 4: Run** `npm run test:web`. Esperado: todo pasa.
- [ ] **Step 5: Commit** `"Conectar perfil, direcciones y recuperar contraseña"`.

---

### Task 9: Carrito con sesión, checkout, confirmación y Mis pedidos

**Files:**
- Modify: `js/comun.js` (`addToCart`, `limpiarCarrito`), `js/estado.js`, `js/paginas/carrito.js`, `js/paginas/checkout.js`, `js/paginas/confirmacion.js`, `js/paginas/pedidos.js`, `js/paginas/login.js`, `js/paginas/registro.js`, `backend/rutas/sitio.js` (agregar `carrito` a `SESION`), `tests/e2e/compra.spec.js`, `tests/e2e/revision.spec.js`, `tests/e2e/teclado.spec.js`, `tests/soporte/fixtures.js`
- Test: `tests/e2e/pedido.spec.js` (nuevo)

**Interfaces:**
- Consumes: rutas de carrito y pedidos, `SESION`.
- Produces: `SESION.carrito` con las líneas guardadas cuando hay sesión. Con sesión, cada cambio del carrito (agregar, cambiar cantidad, quitar, deshacer) se aplica primero a `state.cart` y luego se envía completo con `PUT /api/carrito`. Si el servidor devuelve otra cosa, `state.cart` toma la respuesta y se redibuja.
- Produces: al entrar o registrarse, si hay líneas en el carrito sin sesión, se envían a `POST /api/carrito/fusionar` y luego se borran de `sessionStorage`.
- Produces: `confirmacion.html?n=MK-000001` carga el pedido con `GET /api/pedidos/:numero`. `estado.js` deja de tener `orders`, `lastOrder` y `orderSeq`.
- Produces: `tests/soporte/fixtures.js` agrega `carritoCon(page, lineas)`, que deja el carrito con sesión por la API, y `ponerStock(page, id, kind, ml, stock)`, que llama a `POST /api/_prueba/stock { id, kind, ml, stock }`. Esa ruta se agrega a `backend/rutas/prueba.js` y, como las demás de ese archivo, solo existe con `nodeEnv === 'test'`.

- [ ] **Step 1: Write the failing tests** en `tests/e2e/pedido.spec.js`
  - Agregar khamrah decant 5 ml sin sesión, entrar con una cuenta y ver ese decant en el carrito. Recargar y sigue ahí.
  - Pagar con tarjeta lleva a `confirmacion.html?n=MK-` y muestra el número. `pedidos.html` lo lista con su estado.
  - Mis pedidos muestra "Cargando tus pedidos…" mientras espera y, si `/api/pedidos` responde 503 (simulado con `page.route`), muestra el mensaje y un botón "Reintentar" que vuelve a pedir la lista.
  - Doble clic rápido en Pagar crea un solo pedido.
  - Si entre agregar y pagar otro cliente compró la última unidad (simulado con `ponerStock(page, 'asad', 'decant', 5, 0)` después de llenar el carrito), el checkout muestra el mensaje del servidor en `#co-errors` y no navega.
- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement.** En `checkout.js`, `createOrder` pasa a `POST /api/pedidos` y navega a `confirmacion.html?n=<num>`. Los dos caminos de Deuna mandan `verificacion` (falso al aprobar, verdadero con "Ya pagué y no se actualiza"). El botón de pagar queda con `aria-disabled="true"` mientras espera. En `pedidos.js`, "Listo para retirar" usa `TW.statusCamino`. La fecha se muestra con `toLocaleDateString('es-EC', {day:'numeric', month:'short', year:'numeric'})`.
- [ ] **Step 4: Migrar las pruebas** que usan `state.lastOrder`, `state.orders` o compran. **Stock en las pruebas.** Toda prueba que completa una compra compra decants de 5 ml de un perfume que ninguna otra prueba usa para revisar límites (asad), salvo la de teclado, que sigue comprando Khamrah 50 ml. Así se compran como máximo 3 frascos de Khamrah 50 ml por corrida, uno por ancho. Las pruebas que revisan límites calculan el valor esperado con `maxDe(byId(id), kind, ml)` en lugar de escribir el 6 fijo.
- [ ] **Step 5: Run** `npm run test:web` dos veces seguidas sin recrear la base a mano. Esperado: pasa las dos, porque `globalSetup` la recrea.
- [ ] **Step 6: Commit** `"Guardar carrito y pedidos en la base"`.

---

### Task 10: Catálogo fuera del código del sitio y estado de error

**Files:**
- Move: `js/productos.js` a `herramientas/catalogo.js`
- Modify: `herramientas/generar-sql.mjs` (leer la ruta nueva), `backend/rutas/sitio.js`, `js/comun.js`, `tests/e2e/humo.spec.js`, `tests/api/productos.test.mjs`

**Interfaces:**
- Produces: si la base falla, `/js/productos.js` responde 200 con `const PRODUCTS = null;`. `js/comun.js` revisa `PRODUCTS === null` antes de cualquier otra cosa, y en ese caso pone en `#app` "No pudimos cargar los perfumes" con un botón "Reintentar" que recarga la página, y no ejecuta el resto del arranque.

- [ ] **Step 1: Write the failing tests**
  - En `tests/api/productos.test.mjs`, `fs.existsSync('js/productos.js')` es falso, `herramientas/catalogo.js` existe y `GET /js/productos.js` sigue respondiendo un script con los 70 perfumes.
  - Con `page.route('**/js/productos.js', r => r.fulfill({ body: 'const PRODUCTS = null;', contentType: 'text/javascript' }))`, `index.html` muestra "No pudimos cargar los perfumes", el botón "Reintentar" recibe el foco con Tab y no hay errores de JavaScript en consola.
- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement** con `git mv`. `npm run sql` vuelve a generar un `maisonkage.sql` idéntico al actual (comprobar con `git diff --exit-code database/maisonkage.sql`).
- [ ] **Step 4: Run** `npm test`. Esperado: todo pasa.
- [ ] **Step 5: Commit** `"Sacar el catálogo del código del sitio"`.

---

### Task 11: URLs limpias

**Files:**
- Modify: `backend/rutas/sitio.js`, `js/comun.js` (`PAGE`, `params`, `urlProducto`, `aquiMismo`, `safeNext`), `plantillas/encabezado.html`, las 16 páginas (`<base href="/">` en el `<head>`), `tests/e2e/teclado.spec.js`, `tests/e2e/navegacion.spec.js`
- Test: `tests/e2e/urls.spec.js` (nuevo)

**Interfaces:**
- Produces: `rutaLimpia(pathname) -> { pagina, extra }` en `js/comun.js`. `/perfumes/<slug>` da `{ pagina:'producto.html', extra:{ id:<slug> } }`. `/ofertas` da `catalogo.html` con `oferta=1`. `/decants` da `catalogo.html` con `decant=1`. Cualquier otra ruta da la página del último tramo como hoy. `PAGE` y `params` se calculan con esta función, con los parámetros reales de la dirección por encima de `extra`.
- Produces: `urlProducto(id, decant)` devuelve `/perfumes/<id>` o `/perfumes/<id>?formato=decant`. `aquiMismo()` devuelve `location.pathname.slice(1) + location.search`. `safeNext` acepta además `perfumes/<slug>`, `ofertas` y `decants`, con parámetros.
- Produces: el servidor responde `producto.html` para `/perfumes/:slug` cuando el slug existe y 404 con `404.html` cuando no. `/ofertas` y `/decants` responden `catalogo.html`.

- [ ] **Step 1: Write the failing tests** en `tests/e2e/urls.spec.js`
  - Abrir `/perfumes/khamrah` directo muestra el título Khamrah, carga los estilos y no tiene errores en consola.
  - `/perfumes/no-existe` responde 404 y muestra el buscador del 404.
  - `/ofertas` muestra solo perfumes en oferta. `/decants` muestra la vista de decants.
  - Las tarjetas enlazan a `/perfumes/<id>`. `producto.html?id=khamrah` sigue funcionando.
  - El aviso del corazón en `/perfumes/khamrah` lleva a `login.html?next=perfumes%2Fkhamrah` y al entrar se vuelve a `/perfumes/khamrah`.
- [ ] **Step 2: Run** y confirmar que fallan.
- [ ] **Step 3: Implement.** Actualizar las expresiones de `llega()` en las pruebas de teclado y navegación que esperan `producto\.html\?id=`.
- [ ] **Step 4: Run** `npm test`. Esperado: todo pasa.
- [ ] **Step 5: Commit** `"Agregar URLs limpias para perfumes, ofertas y decants"`.

---

### Task 12: Verificación final

**Files:**
- Modify: `docs/superpowers/specs/2026-10-18-alta-fidelidad-design.md` (sección 11, pendientes), `.env.ejemplo`

- [ ] **Step 1: Run** `npm test` completo. Esperado: pasan las pruebas de la API y todas las de Playwright en los tres anchos, incluida la compra solo con teclado.
- [ ] **Step 2: Revisar a mano** con `npm start` sobre la base `maisonkage` local. Crear cuenta, agregar un frasco y un decant, pagar con tarjeta, ver la confirmación, ver el pedido en Mis pedidos, cerrar sesión y entrar desde otra pestaña privada para ver que el pedido sigue ahí. Con `GMAIL_CLAVE_APP` vacío, el correo aparece en la consola.
- [ ] **Step 3: Revisar seguridad.** `git grep -n "DB_PASSWORD=\|GMAIL_CLAVE_APP=" -- ':!.env.ejemplo'` no devuelve nada. Ninguna respuesta de error de la API incluye `at ` ni nombres de tablas.
- [ ] **Step 4: Actualizar** la sección 11 del documento de diseño, marcando correo y recuperar como resueltos y dejando el hosting y el cambio de clave del servidor del amigo como pendientes. `.env.ejemplo` lista todas las variables que usa `backend/config.js`, sin valores reales.
- [ ] **Step 5: Commit** `"Cerrar la Fase 2"`.
