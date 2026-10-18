# Maison Kage alta fidelidad, documento de diseño

Fecha 18 de octubre de 2026. Autor Rodrigo Cordero. Este documento recoge todas las decisiones acordadas y sirve como contexto fijo del proyecto para cualquier sesión de trabajo.

## 1. Objetivo

Convertir el prototipo de baja fidelidad de Maison Kage en un prototipo interactivo de **alta fidelidad**, completamente navegable y **conectado a una base de datos real**, para el reto RDA2 Criterio 1 de Interacción Humano Computador.

Lo que exige la consigna:

- Enlace web que la doctora revisa en sus dispositivos.
- Diagrama de flujos con la interacción completa del usuario.
- Mínimo 8 pantallas finales con iconografía, tipografía, imágenes, colores e interacciones completas, responsivas y con las heurísticas de usabilidad.
- Aplicación de principios de diseño (jerarquía visual, alineación, ritmo, espaciado, simplicidad, affordance).
- Criterios de accesibilidad WCAG 2.2.
- Al menos 4 conclusiones técnicas en el informe PDF.
- Máximo 5% de texto generado por IA y 9% de coincidencia. Si se supera, se califica sobre la mitad.
- Evaluación sobre 40 puntos con 4 puntos menos por cada error de usabilidad, funcionalidad o accesibilidad.

Requisito de la doctora para la base de datos: **mínimo 10 tablas**. No indicó SGBD.

## 2. Decisiones de stack

- Se reutiliza el repositorio `SKITZO-ec/maison-kage` con su HTML, Tailwind CSS y JavaScript.
- Todo el trabajo va en la rama `alta-fidelidad`. La rama `main` sigue publicada en GitHub Pages con la baja fidelidad entregada.
- Backend en **Node.js con Express**.
- Base de datos **PostgreSQL**.
- Se construye y prueba todo primero, y el hosting se decide al final. Mientras tanto la conexión se lee de un archivo `.env`, de modo que publicar solo cambia ese archivo y exige ejecutar los mismos scripts SQL en el servidor.
- Hay una base PostgreSQL disponible en el servidor de un amigo, accesible solo por túnel SSH con llave privada. Si ese servidor permite publicar Node, se usa ahí. Si no, se contrata un VPS pequeño con Node, PostgreSQL y Nginx.
- Las credenciales y llaves nunca se escriben en el código ni se suben al repositorio.

## 3. Arquitectura

Un solo servidor Express sirve las páginas y la API en `/api/...`.

```
Navegador (HTML, Tailwind, JS)  ->  Express (API)  ->  PostgreSQL
```

Estructura del repositorio:

```
maison-kage/
  frontend/   páginas, css y js con el diseño actual
  backend/    rutas, servicios, conexión y middleware
  database/   maisonkage.sql (un solo script con limpieza, tablas, triggers y datos)
  docs/       documentos de diseño
```

Decisiones clave:

- Los perfumes se leen de `/api/productos`. El arreglo `PRODUCTS` de `datos.js` deja de existir. Se conservan `card()`, las clases `TW` y el diseño visual.
- El `sessionStorage` deja de guardar datos reales. Carrito, cuentas, favoritos y pedidos pasan a la base. El carrito anónimo vive en el navegador y se fusiona con el del usuario al iniciar sesión.
- Login con correo y contraseña. La contraseña se guarda con hash bcrypt y la sesión va en cookie `httpOnly`.
- El checkout es una **transacción**. Bloquea las filas de `Presentacion`, verifica el stock, crea `Pedido`, `PedidoItem`, `Pago` y `Envio`, descuenta el stock y vacía el carrito. Si un paso falla no se guarda nada. La restricción `CHECK (Pre_stock >= 0)` impide stock negativo aunque falle el código.
- Todas las validaciones se repiten en el servidor.

## 4. Reglas de negocio

- Se puede navegar, ver productos y llenar el carrito sin cuenta.
- El inicio de sesión se exige **solo al pagar o al guardar un favorito**.
- Los pagos son simulados, como en la baja fidelidad (tarjeta o Deuna). No hay panel de administración.
- Envío con Servientrega a $3.50, gratis desde $60. Retiro gratis en el local de Quito.
- Decants de 2, 5 y 10 ml, con un máximo de 10 unidades por tamaño y por perfume en el carrito.
- Hay perfumes con una sola presentación y no deben mostrar selector.
- Al confirmar un pedido se envía un correo de confirmación con el estado "en proceso", número de pedido, resumen y guía.

## 5. Cambios de interfaz

**Se elimina**

1. Catálogo del menú y del pie de página. Queda Perfumes.
2. La pestaña Modo de uso de la ficha del producto.
3. El botón "Crear cuenta para seguir tu pedido" de la confirmación.
4. El pago como invitado.
5. Los botones de selección de decant.
6. El selector de presentación en perfumes con una sola.

**Se modifica**

7. Perfumes muestra las categorías y un botón "Ver todos".
8. Tarjeta de crédito de máximo 16 dígitos.
9. Teléfono de 10 dígitos, solo números, empezando en 09, en perfil, registro y checkout.
10. Decants con un solo clic en la presentación para agregar al carrito.
11. Checkout sin sesión lleva al login y regresa con el carrito intacto.
12. Confirmación con la guía de Servientrega explicada en tres pasos (copiar, abrir Servientrega, pegar).
13. Perfil con edición de nombre, apellido y correo. Cambiar el correo exige la contraseña actual. No hay nombre de usuario aparte.

**Se agrega**

14. Aviso pequeño junto al corazón cuando no hay sesión. Dice que para guardar favoritos se cree una cuenta o se inicie sesión, no bloquea la pantalla y se cierra con Escape o con un clic afuera.
15. Aviso de envío gratis cuando la compra llega a $60, aclarando que el beneficio aplica solo desde ese monto.
16. Preguntas frecuentes de modo de uso en Ayuda, con el contenido de la antigua pestaña.
17. Cambiar contraseña en el perfil, con la actual, la nueva (mínimo 8 caracteres) y su confirmación.
18. Ubicación y horario del local en el pie de página.
19. Botón "Ver mis pedidos" en la confirmación.
20. Catálogo de 70 perfumes (sección 6).
21. URLs limpias, por ejemplo `/perfumes/khamrah`, que funcionan al abrirse directo, y páginas de aterrizaje `/ofertas` y `/decants`. El 404 pasa a ser un error útil con buscador y enlaces.
22. Guiar y poner límites al usuario con campos de tipo y largo correctos, mensajes de error que explican cómo arreglarlo, migas de pan, indicador de pasos y "estás aquí".
23. Productos similares en la ficha por familia, origen y público.
24. Mensaje de finalización del pedido reforzado con el aviso del correo enviado.
25. Botón del carrito claro en el encabezado, con icono, texto, contador, contraste alto y tamaño táctil de 44 px.
26. Comprar y quitar con datos validados. Quitar del carrito con opción de deshacer.
27. Seguridad (sección 9).
28. Correo de confirmación (sección 4).

**Mejoras por criterios de IHC**

- Mobile first con tres puntos de ruptura (1024 o más, 768 a 1023, 320 a 767).
- Medidas fluidas en `rem` y `%`, imágenes con `max-width: 100%` y `srcset`, íconos en SVG.
- Elementos táctiles de al menos 44 px.
- Menú principal de 5 a 9 elementos. Con más categorías, el menú Perfumes se agrupa y se despliega de a poco.
- Divulgación progresiva (filtros plegables en móvil, pasos del checkout de uno en uno).
- Estados de componentes (cargando, error con reintentar, vacío) en todas las listas, porque los datos ya vienen de la base.
- Texto real en lugar de texto dentro de imágenes y `alt` descriptivo en cada perfume.
- Rendimiento, con imágenes comprimidas, carga diferida y medición con Lighthouse.
- WCAG 2.2: foco no tapado por el encabezado fijo (2.4.11), tamaño del objetivo (2.5.8), entrada redundante (3.3.7), autenticación accesible con pegar contraseña y botón de mostrarla y sin CAPTCHA visual (3.3.8), ayuda consistente (3.2.6), sin acciones que exijan arrastrar (2.5.7).
- Sección "Vistos recientemente", buscador con sugerencias y animaciones que respetan `prefers-reduced-motion`.
- Prueba con 3 a 5 usuarios y registro de los cambios que provoque.

## 6. Catálogo de 70 perfumes

Datos ficticios (precios, stock, notas y descripciones inventados). Cada categoría tiene **mínimo 10 perfumes**.

| Eje | Valores | Relación |
|---|---|---|
| Público | Hombre, Mujer, Unisex | Un valor por perfume |
| Origen | Árabe, Diseñador, Nicho | Un valor por perfume |
| Familia olfativa | Cítrico y fresco, Floral, Amaderado, Oriental y ámbar, Gourmand, Aromático, Cuero y especiado | Un valor por perfume |
| Ocasión | Oficina, Diario, Citas, Noche, Verano, Eventos | Varios por perfume |
| Concentración | Eau de Toilette, Eau de Parfum, Parfum, Extrait | Un valor por perfume |
| Secciones comerciales | Ofertas, Novedades, Más vendidos, Decants | Banderas |

Siete familias con 10 perfumes cada una dan los 70. Los 12 perfumes actuales se reasignan. Frescos pasa a Cítrico y fresco, Gourmand se mantiene, y Noches y Oficina pasan a ser ocasiones. Se agregan 58 perfumes nuevos. Cada perfume tiene una o varias presentaciones y algunos tienen una sola.

Criterio de aceptación verificable con una consulta SQL: ningún valor de Público, Origen, Familia, Ocasión, Concentración, Ofertas, Novedades, Más vendidos ni Decants tiene menos de 10 perfumes.

## 7. Modelo de datos

Todo el SQL va en **un solo script**, `database/maisonkage.sql`, como el `Script.txt` de Bases de Datos II. Tiene cuatro secciones en orden, cada una con su comentario: limpieza inicial con `DROP ... IF EXISTS`, tablas con restricciones e índices, triggers y datos de los 70 perfumes con sus presentaciones. Así se puede ejecutar de una vez y repetir sin errores.

Convenciones de Bases de Datos II. Nombre de tabla en singular. Cada tabla tiene un prefijo de 3 letras y sus columnas lo llevan (`Usu_id`, `Usu_correo`). Toda tabla tiene clave primaria. Las claves foráneas conservan el nombre de la clave que referencian. Las relaciones N:N usan tabla intermedia. Palabras reservadas de SQL en mayúsculas, restricciones con nombre y condiciones explícitas, comentarios en español en cada columna, e índices con nombres descriptivos sobre claves foráneas y columnas de búsqueda.

17 tablas.

| Tabla | Prefijo | Contenido |
|---|---|---|
| Usuario | USU | Cuenta del cliente (correo único, clave con hash, nombre, apellido, teléfono) |
| Direccion | DIR | Direcciones de envío del usuario |
| Marca | MAR | Marcas de perfumes |
| Familia | FAM | Familias olfativas |
| Ocasion | OCA | Ocasiones de uso |
| Producto | PRO | Perfume (marca, familia, público, origen, concentración, descripción, oferta, novedad, ventas) |
| ProductoOcasion | PRC | Intermedia entre perfume y ocasión |
| Nota | NOT | Notas olfativas |
| ProductoNota | PRN | Intermedia entre perfume y nota, con nivel de la pirámide |
| Presentacion | PRE | Variante vendible (frasco o decant, ml, precio, stock) |
| Favorito | FAV | Perfumes guardados por el usuario |
| Carrito | CAR | Carrito del usuario |
| CarritoItem | CIT | Líneas del carrito |
| Pedido | PED | Pedido con número, estado, totales y tipo de entrega |
| PedidoItem | PIT | Líneas del pedido con precio congelado |
| Pago | PAG | Método de pago, estado y **solo los últimos 4 dígitos** de la tarjeta |
| Envio | ENV | Guía de Servientrega, dirección o retiro en local |

## 8. Fases

1. **Fase 1, interfaz.** Cambios de las secciones 5 y 6 sobre el sitio actual, aún con `sessionStorage`. Se verifica cada pantalla en el navegador en los tres anchos.
2. **Fase 2, datos, base y API.** Esquema, los 70 perfumes, login, carrito, checkout, seguridad y correo. Se prueba con PostgreSQL local, incluyendo dos compras simultáneas del último frasco.
3. **Fase 3, cierre.** Imágenes, video de un perfume nuevo en el inicio (con botón de pausa y sin sonido automático), revisión WCAG 2.2, nuevo diagrama de flujos, informe y publicación.

## 9. Seguridad

- Contraseñas con bcrypt y cookie `httpOnly` con `SameSite`.
- Consultas parametrizadas contra inyección SQL y salida escapada contra XSS.
- Protección CSRF y cabeceras de seguridad con helmet.
- Límite de intentos en el login, sin CAPTCHA visual.
- HTTPS al publicar, claves solo en `.env` y un usuario de base de datos con permisos mínimos.
- Nunca se guarda el número completo de la tarjeta ni el CVV.
- Validación de entradas en el servidor con mensajes claros.

## 10. Reglas del proyecto

- Los commits van a nombre de Rodrigo Cordero y **no llevan a Claude como coautor ni atribución**.
- Los informes se escriben con la voz de Rodrigo y sin rayas largas, punto y coma ni dos puntos. El informe final debe respetar el límite de 5% de texto generado por IA.
- Diseño minimalista, sin botones de navegación innecesarios.
- Las convenciones de código y comentarios de la base siguen Bases de Datos II.

## 11. Pendientes

- Elegir el hosting y el proveedor del correo (Gmail con contraseña de aplicación o un servicio gratuito como Resend). Se decide en la Fase 2.
- Imágenes de los perfumes y video del inicio, en la Fase 3.
- Cambiar la contraseña de la base de datos del servidor del amigo al terminar, porque se compartió por chat.
