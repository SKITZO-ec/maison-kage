# Maison Kage Fase 2, base de datos, API y sesión

Fecha 19 de octubre de 2026. Autor Rodrigo Cordero. Continúa el documento `2026-10-18-alta-fidelidad-design.md`, que sigue valiendo para todo lo que este no cambia.

## 1. Objetivo

Que la tienda deje de guardar sus datos en el navegador y pase a trabajar con PostgreSQL a través de un servidor Express. Al terminar, el catálogo, las cuentas, el carrito con sesión, los favoritos, las direcciones y los pedidos viven en la base, y el sitio funciona igual desde cualquier dispositivo.

Se considera terminada cuando se cumple todo lo siguiente.

- Las pruebas de la Fase 1 pasan contra el servidor real con la base, incluida la compra completa solo con teclado en los tres anchos.
- Cada ruta de la API tiene pruebas, incluidos sus errores.
- La prueba de dos compras simultáneas del último frasco termina con una compra aceptada, otra rechazada con un mensaje claro y el stock en cero, nunca negativo.
- Al confirmar un pedido llega un correo real a la dirección de contacto cuando el `.env` tiene la contraseña de aplicación de Gmail.
- En el código del sitio no queda ningún perfume escrito a mano ni ningún dato real guardado en `sessionStorage`, salvo el carrito de quien no inició sesión.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Enfoque | Se conservan las 16 páginas y su JavaScript. Solo cambia de dónde salen y a dónde van los datos |
| Correo | Gmail con contraseña de aplicación, enviado con nodemailer |
| Recuperar contraseña | Real, con un enlace de un solo uso que vence a los 30 minutos |
| Estados del pedido | Se calculan con el tiempo desde la compra, sin panel de administración |
| Carpetas | Las páginas se quedan en la raíz. El servidor publica solo una lista cerrada de rutas |
| Contraseñas | bcryptjs, que no necesita compilar nada y funciona igual en Windows |
| Hosting | Se decide al final. Todo se configura con el archivo `.env` |

Sobre las carpetas. El diseño anterior proponía mover las páginas a `frontend/`. Se descartó porque el servidor ya publica solo las páginas `.html`, `js/`, `source/` y `plantillas/`, y responde 404 a `backend/`, `database/`, `tests/`, `package.json` y `.env`. Así se logra la misma protección sin mover 16 páginas ni reescribir sus rutas.

## 3. Lo que ya está hecho

- `database/maisonkage.sql` con las 21 tablas, triggers, vista y los 70 perfumes. Se genera con `npm run sql` a partir de `js/productos.js` y se probó en PostgreSQL 16 local.
- `backend/servidor.js` sirve las páginas y arma `js/productos.js` desde la base, así el catálogo ya se lee de PostgreSQL sin cambiar las páginas.
- `GET /api/productos` devuelve los 70 perfumes con la misma forma que usa la tienda.
- Las pruebas de la Fase 1 ya corren contra este servidor y pasan las 256.

## 4. Base de datos

21 tablas con las convenciones de Bases de Datos II (nombre en singular, prefijo de 3 letras en cada columna, clave primaria, restricciones con nombre, comentario en español en cada columna e índices descriptivos).

| Grupo | Tablas |
|---|---|
| Cuenta | Usuario, Direccion, Sesion, RecuperacionClave |
| Catálogo | Marca, Familia, Ocasion, Producto, ProductoOcasion, Nota, ProductoNota, Acorde, ProductoAcorde, Presentacion |
| Compra | Favorito, Carrito, CarritoItem, Pedido, PedidoItem, Pago, Envio |

Reglas que cumple la propia base aunque el código falle.

- `CHECK (Pre_stock >= 0)`, teléfono `^09[0-9]{8}$`, decants solo de 2, 5 y 10 ml, y valores cerrados para público, origen, concentración, método de pago y entrega.
- `trg_pedido_item_stock` descuenta el stock al guardar cada línea del pedido. Si no alcanza lanza "No hay stock suficiente de Khamrah 50 ml" y la transacción completa se deshace.
- `trg_pedido_numero` genera el número `MK-000001` con una secuencia.
- `trg_direccion_principal` deja una sola dirección principal por usuario.
- `trg_carrito_item_decant` impide más de 10 decants del mismo tamaño.
- `Vista_pedido` calcula el estado. Pago en verificación durante 2 minutos si fue Deuna y quedó en verificación, En preparación hasta los 5 minutos, En camino (o Listo para retirar) hasta los 15 y Entregado después.

Los tablespaces `DATOS` e `INDICES` de BD2 no se usan. En PostgreSQL todo va a `pg_default`, y crear un tablespace exige superusuario y una carpeta del servidor, que en el servidor del amigo no se tiene. Se explica en el informe.

La aplicación se conecta con un usuario que solo puede leer y modificar filas. La sección 5 del script le da esos permisos a `maisonkage_app` si existe.

## 5. API

Todas las rutas van bajo `/api`, reciben y responden JSON, y los errores vuelven como `{ "error": "mensaje en español" }` con el código HTTP que corresponde. La página muestra ese mensaje tal cual.

| Área | Ruta | Sesión |
|---|---|---|
| Catálogo | `GET /productos`, `GET /productos/:slug` | No |
| Cuenta | `POST /registro`, `POST /login`, `POST /logout`, `GET /yo` | No |
| Perfil | `PATCH /yo` (nombre, apellido, teléfono, correo con la clave actual), `PUT /yo/clave` | Sí |
| Recuperar | `POST /recuperar` (pide el enlace), `POST /recuperar/:codigo` (pone la clave nueva) | No |
| Direcciones | `GET /direcciones`, `POST /direcciones`, `PATCH /direcciones/:id`, `DELETE /direcciones/:id` | Sí |
| Favoritos | `GET /favoritos`, `PUT /favoritos/:slug`, `DELETE /favoritos/:slug` | Sí |
| Carrito | `GET /carrito`, `PUT /carrito` (reemplaza todas las líneas), `POST /carrito/fusionar` | Sí |
| Pedidos | `POST /pedidos`, `GET /pedidos`, `GET /pedidos/:numero` | Sí |

`GET /yo` responde `null` cuando no hay sesión, así cada página sabe si mostrar "Iniciar sesión" o el nombre del usuario.

Una línea del carrito se identifica igual que hoy, con el perfume, el tipo y los ml (`{ id, kind, ml, qty }`). El servidor la traduce a la `Presentacion` que corresponde.

### Pedido

`POST /pedidos` recibe los datos de entrega, el método de pago y, si es tarjeta, solo los últimos 4 dígitos. Las líneas no vienen del navegador, se toman del carrito guardado en la base. El servidor hace todo dentro de una transacción.

1. Bloquea las filas de `Presentacion` del carrito con `SELECT ... FOR UPDATE`.
2. Verifica stock y límite de decants, y calcula precios con la oferta, envío y total con los datos de la base. Nunca confía en precios que vengan del navegador.
3. Inserta `Pedido`, `PedidoItem` (el trigger descuenta el stock), `Pago` y `Envio` con una guía de 10 dígitos si es envío.
4. Vacía el carrito y confirma la transacción.
5. Envía el correo de confirmación después de confirmar. Si el correo falla, el pedido igual queda guardado y el error se registra.

Si cualquier paso falla, no se guarda nada y la respuesta explica qué pasó, por ejemplo "Solo quedan 2 frascos de Khamrah 100 ml".

## 6. Sesión y carrito

- Al iniciar sesión se crea una fila en `Sesion` con el hash SHA-256 de un código aleatorio de 32 bytes. La cookie `mk_sesion` guarda el código, es `httpOnly`, `SameSite=Lax`, `Secure` cuando hay HTTPS y vence a los 7 días.
- Cerrar sesión borra la fila, así la cookie deja de valer aunque alguien la haya copiado.
- Quien no inició sesión guarda su carrito en `sessionStorage`, como hoy.
- Al iniciar sesión o crear la cuenta, ese carrito se envía a `POST /carrito/fusionar`. Se suma al que ya estaba en la base, respetando el stock y el máximo de 10 decants, y se borra del navegador.
- Con sesión, el carrito vive solo en la base y se ve igual en cualquier dispositivo.
- Los favoritos exigen sesión. El favorito pendiente del aviso del corazón se guarda al volver del login, como en la Fase 1.

## 7. Cambios en el sitio

- Un archivo nuevo `js/api.js` concentra todas las llamadas a `/api`, con el código CSRF y el manejo de errores.
- `js/productos.js` se borra del repositorio. Las páginas reciben `PRODUCTS` desde la base.
- `js/estado.js` deja de guardar cuentas, pedidos y favoritos. Solo queda el carrito sin sesión.
- Todas las páginas que leían `state.accounts`, `state.orders` o `state.favs` pasan a pedir esos datos a la API.
- Las listas muestran sus tres estados (cargando, vacío y error con botón de reintentar), porque ahora los datos llegan por la red.
- La página de recuperar contraseña pide el correo, y una pantalla nueva en la misma página recibe el código del enlace y pide la clave nueva dos veces.
- Se quita el hash SHA-256 provisional del navegador. La contraseña viaja al servidor y allí se guarda con bcrypt.
- URLs limpias servidas por Express. `/perfumes/khamrah` abre la ficha, `/ofertas` y `/decants` abren el catálogo filtrado. Las páginas llevan `<base href="/">` para que sus rutas relativas funcionen desde cualquier URL. Las direcciones antiguas como `producto.html?id=khamrah` siguen funcionando.

El diseño visual, el orden de tabulación y todo lo de accesibilidad de la Fase 1 no cambian.

## 8. Seguridad

- Contraseñas con bcryptjs (costo 12) y mínimo de 8 caracteres.
- Cookie de sesión `httpOnly` con `SameSite=Lax`.
- Protección CSRF con doble envío. El servidor entrega un código en una cookie legible y cada petición que cambia datos lo repite en la cabecera `X-CSRF`. Si no coinciden, responde 403.
- Login, registro y recuperar con un límite de 5 intentos cada 15 minutos por dirección IP. Después responde "Demasiados intentos, espera unos minutos", sin CAPTCHA visual (WCAG 3.3.8).
- Recuperar responde siempre lo mismo, "Si el correo tiene una cuenta, te enviamos un enlace", así no se puede averiguar qué correos están registrados. El código se guarda con hash, vence a los 30 minutos y solo sirve una vez. Al usarlo se cierran todas las sesiones abiertas de esa cuenta.
- Cambiar el correo exige la contraseña actual.
- Consultas siempre parametrizadas.
- Cabeceras de seguridad con helmet, con una política de contenido que permite solo el CDN de Tailwind y Google Fonts.
- Validación de cada campo en el servidor con las mismas reglas que el navegador (correo, teléfono de 10 dígitos que empieza en 09, cantidades, ciudades permitidas).
- `.env` fuera del repositorio. `.env.ejemplo` muestra solo los nombres de las variables.
- Nunca se guarda el número completo de la tarjeta ni el CVV.

## 9. Correo

- Se envía con nodemailer por el SMTP de Gmail con las variables `GMAIL_USUARIO` y `GMAIL_CLAVE_APP`.
- El correo del pedido lleva número, estado "En proceso", productos con cantidades y precios, total, tipo de entrega y, si es envío, la guía con los tres pasos para rastrearla en Servientrega.
- El correo de recuperar lleva el enlace con el código y avisa que vence en 30 minutos.
- Sin `GMAIL_CLAVE_APP` el correo se escribe en la consola del servidor.
- En las pruebas los correos se guardan en memoria y una ruta que solo existe con `NODE_ENV=test` permite leerlos, así se verifica su contenido sin enviar nada.

## 10. Pruebas

- Base separada `maisonkage_test`, que se recrea con `maisonkage.sql` antes de cada corrida.
- Pruebas de la API con el corredor de pruebas de Node, una por regla y por error (stock insuficiente, sesión vencida, CSRF faltante, código de recuperación vencido o usado, correo repetido, teléfono inválido, precio manipulado desde el navegador).
- Prueba de concurrencia con dos compras simultáneas del último frasco.
- Las pruebas de Playwright de la Fase 1 corren contra el servidor real. Las que hoy preparan cuentas o pedidos escribiendo en `state` pasan a crearlos con la API.
- Consultas SQL que comprueban los 70 perfumes y el mínimo de 10 por categoría.

## 11. Fuera de esta fase

- Hosting y publicación.
- Imágenes de los perfumes y video del inicio, en la Fase 3.
- Panel de administración, que no se pide.
- Pagos reales.

## 12. Reglas del proyecto

Se mantienen las del documento anterior. Los commits van a nombre de Rodrigo Cordero sin Claude como coautor ni atribución, los textos y comentarios con la voz de Rodrigo y sin rayas largas, punto y coma ni dos puntos, y el diseño minimalista.
