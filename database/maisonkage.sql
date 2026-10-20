-- =========================================================
-- MAISON KAGE · Base de datos de la tienda
-- PostgreSQL 14 o superior
-- Autor Rodrigo Cordero
-- Archivo generado por herramientas/generar-sql.mjs a partir de js/productos.js
-- Se ejecuta completo de una vez y se puede repetir sin errores
-- =========================================================
SET client_encoding = 'UTF8';


-- =========================================================
-- 1. LIMPIEZA INICIAL
-- Permite ejecutar el script varias veces sin errores
-- =========================================================
DROP VIEW IF EXISTS Vista_pedido CASCADE;
DROP TABLE IF EXISTS Envio, Pago, PedidoItem, Pedido, CarritoItem, Carrito, Favorito,
  Presentacion, ProductoAcorde, Acorde, ProductoNota, Nota, ProductoOcasion, Producto,
  Ocasion, Familia, Marca, RecuperacionClave, Sesion, Direccion, Usuario CASCADE;
DROP FUNCTION IF EXISTS fn_numero_pedido() CASCADE;
DROP FUNCTION IF EXISTS fn_descontar_stock() CASCADE;
DROP FUNCTION IF EXISTS fn_direccion_principal() CASCADE;
DROP FUNCTION IF EXISTS fn_limite_decant() CASCADE;
DROP SEQUENCE IF EXISTS seq_numero_pedido;


-- =========================================================
-- 2. TABLAS, RESTRICCIONES E ÍNDICES
-- =========================================================

-- Cuenta del cliente
CREATE TABLE Usuario (
  Usu_id              SERIAL        NOT NULL, -- Identificador del usuario
  Usu_correo          VARCHAR(120)  NOT NULL, -- Correo con el que inicia sesión, único
  Usu_clave           VARCHAR(100)  NOT NULL, -- Hash bcrypt de la contraseña, nunca el texto plano
  Usu_nombre          VARCHAR(60)   NOT NULL, -- Nombre del cliente
  Usu_apellido        VARCHAR(60)   NOT NULL, -- Apellido del cliente
  Usu_telefono        CHAR(10)      NULL,     -- Celular de 10 dígitos que empieza en 09
  Usu_fecha_registro  TIMESTAMP     NOT NULL DEFAULT NOW(), -- Fecha en que se creó la cuenta
  CONSTRAINT pk_usuario PRIMARY KEY (Usu_id),
  CONSTRAINT uq_usuario_correo UNIQUE (Usu_correo),
  CONSTRAINT ck_usuario_correo CHECK (Usu_correo = LOWER(Usu_correo) AND Usu_correo LIKE '%_@_%._%'),
  CONSTRAINT ck_usuario_telefono CHECK (Usu_telefono IS NULL OR Usu_telefono ~ '^09[0-9]{8}$')
);

-- Direcciones de envío guardadas por el usuario
CREATE TABLE Direccion (
  Dir_id          SERIAL        NOT NULL, -- Identificador de la dirección
  Usu_id          INTEGER       NOT NULL, -- Usuario dueño de la dirección
  Dir_alias       VARCHAR(40)   NOT NULL, -- Nombre corto como Casa u Oficina
  Dir_calle       VARCHAR(160)  NOT NULL, -- Calle principal, número y secundaria
  Dir_ciudad      VARCHAR(40)   NOT NULL, -- Ciudad de entrega
  Dir_referencia  VARCHAR(160)  NULL,     -- Referencia para el mensajero
  Dir_telefono    CHAR(10)      NOT NULL, -- Celular de contacto para la entrega
  Dir_principal   BOOLEAN       NOT NULL DEFAULT FALSE, -- Indica si es la dirección que se propone primero
  CONSTRAINT pk_direccion PRIMARY KEY (Dir_id),
  CONSTRAINT fk_direccion_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id) ON DELETE CASCADE,
  CONSTRAINT ck_direccion_telefono CHECK (Dir_telefono ~ '^09[0-9]{8}$')
);

-- Sesiones abiertas, la cookie solo guarda un código aleatorio
CREATE TABLE Sesion (
  Ses_id          SERIAL        NOT NULL, -- Identificador de la sesión
  Usu_id          INTEGER       NOT NULL, -- Usuario que inició la sesión
  Ses_token_hash  CHAR(64)      NOT NULL, -- Hash SHA-256 del código guardado en la cookie
  Ses_creada      TIMESTAMP     NOT NULL DEFAULT NOW(), -- Momento en que se inició la sesión
  Ses_vence       TIMESTAMP     NOT NULL, -- Momento en que la sesión deja de valer
  CONSTRAINT pk_sesion PRIMARY KEY (Ses_id),
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id) ON DELETE CASCADE,
  CONSTRAINT uq_sesion_token UNIQUE (Ses_token_hash),
  CONSTRAINT ck_sesion_vence CHECK (Ses_vence > Ses_creada)
);

-- Códigos de un solo uso para recuperar la contraseña
CREATE TABLE RecuperacionClave (
  Rec_id          SERIAL        NOT NULL, -- Identificador de la solicitud
  Usu_id          INTEGER       NOT NULL, -- Usuario que pidió recuperar su contraseña
  Rec_token_hash  CHAR(64)      NOT NULL, -- Hash SHA-256 del código enviado por correo
  Rec_vence       TIMESTAMP     NOT NULL, -- Vencimiento del código, 30 minutos después de pedirlo
  Rec_usado       BOOLEAN       NOT NULL DEFAULT FALSE, -- Indica si el código ya se usó
  CONSTRAINT pk_recuperacion PRIMARY KEY (Rec_id),
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id) ON DELETE CASCADE,
  CONSTRAINT uq_recuperacion_token UNIQUE (Rec_token_hash)
);

-- Marcas de perfumes
CREATE TABLE Marca (
  Mar_id      SERIAL       NOT NULL, -- Identificador de la marca
  Mar_nombre  VARCHAR(60)  NOT NULL, -- Nombre de la marca
  CONSTRAINT pk_marca PRIMARY KEY (Mar_id),
  CONSTRAINT uq_marca_nombre UNIQUE (Mar_nombre)
);

-- Familias olfativas
CREATE TABLE Familia (
  Fam_id      SERIAL       NOT NULL, -- Identificador de la familia
  Fam_codigo  VARCHAR(20)  NOT NULL, -- Código corto usado en las URLs y filtros
  Fam_nombre  VARCHAR(40)  NOT NULL, -- Nombre que se muestra en la tienda
  CONSTRAINT pk_familia PRIMARY KEY (Fam_id),
  CONSTRAINT uq_familia_codigo UNIQUE (Fam_codigo)
);

-- Ocasiones de uso
CREATE TABLE Ocasion (
  Oca_id      SERIAL       NOT NULL, -- Identificador de la ocasión
  Oca_nombre  VARCHAR(30)  NOT NULL, -- Nombre de la ocasión como Oficina o Noche
  CONSTRAINT pk_ocasion PRIMARY KEY (Oca_id),
  CONSTRAINT uq_ocasion_nombre UNIQUE (Oca_nombre)
);

-- Perfume del catálogo
CREATE TABLE Producto (
  Pro_id             SERIAL        NOT NULL, -- Identificador del perfume
  Pro_slug           VARCHAR(60)   NOT NULL, -- Nombre para la URL, por ejemplo khamrah
  Pro_nombre         VARCHAR(80)   NOT NULL, -- Nombre comercial del perfume
  Mar_id             INTEGER       NOT NULL, -- Marca del perfume
  Fam_id             INTEGER       NOT NULL, -- Familia olfativa
  Pro_publico        VARCHAR(10)   NOT NULL, -- Público al que va dirigido
  Pro_origen         VARCHAR(10)   NOT NULL, -- Origen árabe, diseñador o nicho
  Pro_concentracion  VARCHAR(20)   NOT NULL, -- Concentración del perfume
  Pro_descripcion    TEXT          NOT NULL, -- Descripción que se muestra en la ficha
  Pro_oferta         SMALLINT      NOT NULL DEFAULT 0, -- Porcentaje de descuento sobre los frascos, 0 si no está en oferta
  Pro_novedad        BOOLEAN       NOT NULL DEFAULT FALSE, -- Indica si aparece en Novedades
  Pro_mas_vendido    BOOLEAN       NOT NULL DEFAULT FALSE, -- Indica si aparece en Más vendidos
  Pro_activo         BOOLEAN       NOT NULL DEFAULT TRUE,  -- Indica si se muestra en la tienda
  CONSTRAINT pk_producto PRIMARY KEY (Pro_id),
  CONSTRAINT uq_producto_slug UNIQUE (Pro_slug),
  CONSTRAINT fk_producto_marca FOREIGN KEY (Mar_id) REFERENCES Marca (Mar_id),
  CONSTRAINT fk_producto_familia FOREIGN KEY (Fam_id) REFERENCES Familia (Fam_id),
  CONSTRAINT ck_producto_slug CHECK (Pro_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT ck_producto_publico CHECK (Pro_publico IN ('hombre', 'mujer', 'unisex')),
  CONSTRAINT ck_producto_origen CHECK (Pro_origen IN ('arabe', 'disenador', 'nicho')),
  CONSTRAINT ck_producto_concentracion CHECK (Pro_concentracion IN ('Eau de Toilette', 'Eau de Parfum', 'Parfum', 'Extrait')),
  CONSTRAINT ck_producto_oferta CHECK (Pro_oferta BETWEEN 0 AND 90)
);

-- Intermedia entre perfume y ocasión
CREATE TABLE ProductoOcasion (
  Prc_id  SERIAL   NOT NULL, -- Identificador de la relación
  Pro_id  INTEGER  NOT NULL, -- Perfume
  Oca_id  INTEGER  NOT NULL, -- Ocasión en la que se recomienda
  CONSTRAINT pk_producto_ocasion PRIMARY KEY (Prc_id),
  CONSTRAINT fk_producto_ocasion_producto FOREIGN KEY (Pro_id) REFERENCES Producto (Pro_id) ON DELETE CASCADE,
  CONSTRAINT fk_producto_ocasion_ocasion FOREIGN KEY (Oca_id) REFERENCES Ocasion (Oca_id),
  CONSTRAINT uq_producto_ocasion UNIQUE (Pro_id, Oca_id)
);

-- Notas olfativas
CREATE TABLE Nota (
  Not_id      SERIAL       NOT NULL, -- Identificador de la nota
  Not_nombre  VARCHAR(40)  NOT NULL, -- Nombre de la nota como Vainilla o Bergamota
  CONSTRAINT pk_nota PRIMARY KEY (Not_id),
  CONSTRAINT uq_nota_nombre UNIQUE (Not_nombre)
);

-- Intermedia entre perfume y nota, con su nivel en la pirámide
CREATE TABLE ProductoNota (
  Prn_id     SERIAL       NOT NULL, -- Identificador de la relación
  Pro_id     INTEGER      NOT NULL, -- Perfume
  Not_id     INTEGER      NOT NULL, -- Nota que contiene
  Prn_nivel  VARCHAR(10)  NOT NULL, -- Nivel de la pirámide, salida, corazón o fondo
  Prn_orden  SMALLINT     NOT NULL, -- Posición de la nota dentro de su nivel
  CONSTRAINT pk_producto_nota PRIMARY KEY (Prn_id),
  CONSTRAINT fk_producto_nota_producto FOREIGN KEY (Pro_id) REFERENCES Producto (Pro_id) ON DELETE CASCADE,
  CONSTRAINT fk_producto_nota_nota FOREIGN KEY (Not_id) REFERENCES Nota (Not_id),
  CONSTRAINT uq_producto_nota UNIQUE (Pro_id, Not_id, Prn_nivel),
  CONSTRAINT ck_producto_nota_nivel CHECK (Prn_nivel IN ('salida', 'corazon', 'fondo')),
  CONSTRAINT ck_producto_nota_orden CHECK (Prn_orden > 0)
);

-- Acordes que describen el perfume
CREATE TABLE Acorde (
  Aco_id      SERIAL       NOT NULL, -- Identificador del acorde
  Aco_nombre  VARCHAR(40)  NOT NULL, -- Nombre del acorde como Dulce o Amaderado
  CONSTRAINT pk_acorde PRIMARY KEY (Aco_id),
  CONSTRAINT uq_acorde_nombre UNIQUE (Aco_nombre)
);

-- Intermedia entre perfume y acorde, con su intensidad
CREATE TABLE ProductoAcorde (
  Pra_id     SERIAL    NOT NULL, -- Identificador de la relación
  Pro_id     INTEGER   NOT NULL, -- Perfume
  Aco_id     INTEGER   NOT NULL, -- Acorde que tiene
  Pra_valor  SMALLINT  NOT NULL, -- Intensidad del acorde de 1 a 100, se dibuja como barra
  CONSTRAINT pk_producto_acorde PRIMARY KEY (Pra_id),
  CONSTRAINT fk_producto_acorde_producto FOREIGN KEY (Pro_id) REFERENCES Producto (Pro_id) ON DELETE CASCADE,
  CONSTRAINT fk_producto_acorde_acorde FOREIGN KEY (Aco_id) REFERENCES Acorde (Aco_id),
  CONSTRAINT uq_producto_acorde UNIQUE (Pro_id, Aco_id),
  CONSTRAINT ck_producto_acorde_valor CHECK (Pra_valor BETWEEN 1 AND 100)
);

-- Variante que se vende, un frasco o un decant
CREATE TABLE Presentacion (
  Pre_id      SERIAL        NOT NULL, -- Identificador de la presentación
  Pro_id      INTEGER       NOT NULL, -- Perfume al que pertenece
  Pre_tipo    VARCHAR(6)    NOT NULL, -- Tipo de presentación, frasco o decant
  Pre_ml      SMALLINT      NOT NULL, -- Contenido en mililitros
  Pre_precio  NUMERIC(8,2)  NOT NULL, -- Precio de lista en dólares, sin descuento
  Pre_stock   INTEGER       NOT NULL, -- Unidades disponibles
  CONSTRAINT pk_presentacion PRIMARY KEY (Pre_id),
  CONSTRAINT fk_presentacion_producto FOREIGN KEY (Pro_id) REFERENCES Producto (Pro_id) ON DELETE CASCADE,
  CONSTRAINT uq_presentacion UNIQUE (Pro_id, Pre_tipo, Pre_ml),
  CONSTRAINT ck_presentacion_tipo CHECK (Pre_tipo IN ('frasco', 'decant')),
  CONSTRAINT ck_presentacion_ml CHECK ((Pre_tipo = 'decant' AND Pre_ml IN (2, 5, 10)) OR (Pre_tipo = 'frasco' AND Pre_ml > 10)),
  CONSTRAINT ck_presentacion_precio CHECK (Pre_precio > 0),
  CONSTRAINT ck_presentacion_stock CHECK (Pre_stock >= 0)
);

-- Perfumes guardados como favoritos
CREATE TABLE Favorito (
  Fav_id     SERIAL     NOT NULL, -- Identificador del favorito
  Usu_id     INTEGER    NOT NULL, -- Usuario que lo guardó
  Pro_id     INTEGER    NOT NULL, -- Perfume guardado
  Fav_fecha  TIMESTAMP  NOT NULL DEFAULT NOW(), -- Momento en que se guardó
  CONSTRAINT pk_favorito PRIMARY KEY (Fav_id),
  CONSTRAINT fk_favorito_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorito_producto FOREIGN KEY (Pro_id) REFERENCES Producto (Pro_id) ON DELETE CASCADE,
  CONSTRAINT uq_favorito UNIQUE (Usu_id, Pro_id)
);

-- Carrito del usuario con sesión, uno por usuario
CREATE TABLE Carrito (
  Car_id           SERIAL     NOT NULL, -- Identificador del carrito
  Usu_id           INTEGER    NOT NULL, -- Usuario dueño del carrito
  Car_actualizado  TIMESTAMP  NOT NULL DEFAULT NOW(), -- Última vez que cambió
  CONSTRAINT pk_carrito PRIMARY KEY (Car_id),
  CONSTRAINT fk_carrito_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id) ON DELETE CASCADE,
  CONSTRAINT uq_carrito_usuario UNIQUE (Usu_id)
);

-- Líneas del carrito
CREATE TABLE CarritoItem (
  Cit_id        SERIAL    NOT NULL, -- Identificador de la línea
  Car_id        INTEGER   NOT NULL, -- Carrito al que pertenece
  Pre_id        INTEGER   NOT NULL, -- Presentación elegida
  Cit_cantidad  SMALLINT  NOT NULL, -- Unidades de esa presentación
  CONSTRAINT pk_carrito_item PRIMARY KEY (Cit_id),
  CONSTRAINT fk_carrito_item_carrito FOREIGN KEY (Car_id) REFERENCES Carrito (Car_id) ON DELETE CASCADE,
  CONSTRAINT fk_carrito_item_presentacion FOREIGN KEY (Pre_id) REFERENCES Presentacion (Pre_id),
  CONSTRAINT uq_carrito_item UNIQUE (Car_id, Pre_id),
  CONSTRAINT ck_carrito_item_cantidad CHECK (Cit_cantidad > 0)
);

-- Pedido confirmado
CREATE TABLE Pedido (
  Ped_id        SERIAL        NOT NULL, -- Identificador del pedido
  Ped_numero    VARCHAR(12)   NOT NULL, -- Número que ve el cliente, por ejemplo MK-000123
  Usu_id        INTEGER       NOT NULL, -- Cuenta que hizo el pedido
  Ped_fecha     TIMESTAMP     NOT NULL DEFAULT NOW(), -- Momento de la compra, de aquí sale el estado
  Ped_entrega   VARCHAR(6)    NOT NULL, -- Envío por Servientrega o retiro en el local
  Ped_nombre    VARCHAR(120)  NOT NULL, -- Nombre de quien recibe
  Ped_correo    VARCHAR(120)  NOT NULL, -- Correo al que se envía la confirmación
  Ped_telefono  CHAR(10)      NOT NULL, -- Celular de contacto
  Ped_subtotal  NUMERIC(8,2)  NOT NULL, -- Suma de las líneas con su precio congelado
  Ped_envio     NUMERIC(8,2)  NOT NULL, -- Costo del envío, 0 en retiro o desde 60 dólares
  Ped_total     NUMERIC(8,2)  NOT NULL, -- Subtotal más envío
  CONSTRAINT pk_pedido PRIMARY KEY (Ped_id),
  CONSTRAINT uq_pedido_numero UNIQUE (Ped_numero),
  CONSTRAINT fk_pedido_usuario FOREIGN KEY (Usu_id) REFERENCES Usuario (Usu_id),
  CONSTRAINT ck_pedido_entrega CHECK (Ped_entrega IN ('envio', 'retiro')),
  CONSTRAINT ck_pedido_telefono CHECK (Ped_telefono ~ '^09[0-9]{8}$'),
  CONSTRAINT ck_pedido_montos CHECK (Ped_subtotal > 0 AND Ped_envio >= 0 AND Ped_total = Ped_subtotal + Ped_envio)
);

-- Líneas del pedido con el precio del momento de la compra
CREATE TABLE PedidoItem (
  Pit_id        SERIAL        NOT NULL, -- Identificador de la línea
  Ped_id        INTEGER       NOT NULL, -- Pedido al que pertenece
  Pre_id        INTEGER       NOT NULL, -- Presentación comprada
  Pit_cantidad  SMALLINT      NOT NULL, -- Unidades compradas
  Pit_precio    NUMERIC(8,2)  NOT NULL, -- Precio unitario cobrado, ya con la oferta
  CONSTRAINT pk_pedido_item PRIMARY KEY (Pit_id),
  CONSTRAINT fk_pedido_item_pedido FOREIGN KEY (Ped_id) REFERENCES Pedido (Ped_id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_item_presentacion FOREIGN KEY (Pre_id) REFERENCES Presentacion (Pre_id),
  CONSTRAINT uq_pedido_item UNIQUE (Ped_id, Pre_id),
  CONSTRAINT ck_pedido_item_cantidad CHECK (Pit_cantidad > 0),
  CONSTRAINT ck_pedido_item_precio CHECK (Pit_precio > 0)
);

-- Pago simulado del pedido
CREATE TABLE Pago (
  Pag_id            SERIAL      NOT NULL, -- Identificador del pago
  Ped_id            INTEGER     NOT NULL, -- Pedido que se pagó
  Pag_metodo        VARCHAR(7)  NOT NULL, -- Tarjeta o Deuna
  Pag_ultimos4      CHAR(4)     NULL,     -- Solo los últimos 4 dígitos de la tarjeta, nunca el número completo
  Pag_verificacion  BOOLEAN     NOT NULL DEFAULT FALSE, -- Indica si un pago Deuna quedó en verificación
  Pag_fecha         TIMESTAMP   NOT NULL DEFAULT NOW(), -- Momento del pago
  CONSTRAINT pk_pago PRIMARY KEY (Pag_id),
  CONSTRAINT fk_pago_pedido FOREIGN KEY (Ped_id) REFERENCES Pedido (Ped_id) ON DELETE CASCADE,
  CONSTRAINT uq_pago_pedido UNIQUE (Ped_id),
  CONSTRAINT ck_pago_metodo CHECK (Pag_metodo IN ('tarjeta', 'deuna')),
  CONSTRAINT ck_pago_tarjeta CHECK ((Pag_metodo = 'tarjeta' AND Pag_ultimos4 ~ '^[0-9]{4}$') OR (Pag_metodo = 'deuna' AND Pag_ultimos4 IS NULL)),
  CONSTRAINT ck_pago_verificacion CHECK (Pag_verificacion = FALSE OR Pag_metodo = 'deuna')
);

-- Datos de entrega del pedido
CREATE TABLE Envio (
  Env_id          SERIAL        NOT NULL, -- Identificador del envío
  Ped_id          INTEGER       NOT NULL, -- Pedido que se entrega
  Env_guia        VARCHAR(20)   NULL,     -- Número de guía de Servientrega, vacío en retiro
  Env_calle       VARCHAR(160)  NULL,     -- Dirección de entrega, vacía en retiro
  Env_ciudad      VARCHAR(40)   NULL,     -- Ciudad de entrega, vacía en retiro
  Env_referencia  VARCHAR(160)  NULL,     -- Referencia para el mensajero
  CONSTRAINT pk_envio PRIMARY KEY (Env_id),
  CONSTRAINT fk_envio_pedido FOREIGN KEY (Ped_id) REFERENCES Pedido (Ped_id) ON DELETE CASCADE,
  CONSTRAINT uq_envio_pedido UNIQUE (Ped_id),
  CONSTRAINT ck_envio_datos CHECK ((Env_guia IS NULL AND Env_calle IS NULL AND Env_ciudad IS NULL) OR (Env_guia IS NOT NULL AND Env_calle IS NOT NULL AND Env_ciudad IS NOT NULL))
);

-- Índices sobre claves foráneas y columnas de búsqueda
CREATE INDEX idx_direccion_usuario ON Direccion (Usu_id);
CREATE INDEX idx_sesion_usuario ON Sesion (Usu_id);
CREATE INDEX idx_recuperacion_usuario ON RecuperacionClave (Usu_id);
CREATE INDEX idx_producto_marca ON Producto (Mar_id);
CREATE INDEX idx_producto_familia ON Producto (Fam_id);
CREATE INDEX idx_producto_nombre ON Producto (LOWER(Pro_nombre));
CREATE INDEX idx_producto_ocasion_ocasion ON ProductoOcasion (Oca_id);
CREATE INDEX idx_producto_nota_nota ON ProductoNota (Not_id);
CREATE INDEX idx_producto_acorde_acorde ON ProductoAcorde (Aco_id);
CREATE INDEX idx_presentacion_producto ON Presentacion (Pro_id);
CREATE INDEX idx_favorito_producto ON Favorito (Pro_id);
CREATE INDEX idx_carrito_item_presentacion ON CarritoItem (Pre_id);
CREATE INDEX idx_pedido_usuario_fecha ON Pedido (Usu_id, Ped_fecha DESC);
CREATE INDEX idx_pedido_item_presentacion ON PedidoItem (Pre_id);

-- Comentarios de tablas y columnas
COMMENT ON TABLE Usuario IS 'Cuenta del cliente';
COMMENT ON TABLE Direccion IS 'Direcciones de envío guardadas por el usuario';
COMMENT ON TABLE Sesion IS 'Sesiones abiertas, la cookie solo guarda un código aleatorio';
COMMENT ON TABLE RecuperacionClave IS 'Códigos de un solo uso para recuperar la contraseña';
COMMENT ON TABLE Marca IS 'Marcas de perfumes';
COMMENT ON TABLE Familia IS 'Familias olfativas';
COMMENT ON TABLE Ocasion IS 'Ocasiones de uso';
COMMENT ON TABLE Producto IS 'Perfume del catálogo';
COMMENT ON TABLE ProductoOcasion IS 'Intermedia entre perfume y ocasión';
COMMENT ON TABLE Nota IS 'Notas olfativas';
COMMENT ON TABLE ProductoNota IS 'Intermedia entre perfume y nota, con su nivel en la pirámide';
COMMENT ON TABLE Acorde IS 'Acordes que describen el perfume';
COMMENT ON TABLE ProductoAcorde IS 'Intermedia entre perfume y acorde, con su intensidad';
COMMENT ON TABLE Presentacion IS 'Variante que se vende, un frasco o un decant';
COMMENT ON TABLE Favorito IS 'Perfumes guardados como favoritos';
COMMENT ON TABLE Carrito IS 'Carrito del usuario con sesión, uno por usuario';
COMMENT ON TABLE CarritoItem IS 'Líneas del carrito';
COMMENT ON TABLE Pedido IS 'Pedido confirmado';
COMMENT ON TABLE PedidoItem IS 'Líneas del pedido con el precio del momento de la compra';
COMMENT ON TABLE Pago IS 'Pago simulado del pedido';
COMMENT ON TABLE Envio IS 'Datos de entrega del pedido';
COMMENT ON COLUMN Usuario.Usu_id IS 'Identificador del usuario';
COMMENT ON COLUMN Usuario.Usu_correo IS 'Correo con el que inicia sesión, único';
COMMENT ON COLUMN Usuario.Usu_clave IS 'Hash bcrypt de la contraseña, nunca el texto plano';
COMMENT ON COLUMN Usuario.Usu_nombre IS 'Nombre del cliente';
COMMENT ON COLUMN Usuario.Usu_apellido IS 'Apellido del cliente';
COMMENT ON COLUMN Usuario.Usu_telefono IS 'Celular de 10 dígitos que empieza en 09';
COMMENT ON COLUMN Usuario.Usu_fecha_registro IS 'Fecha en que se creó la cuenta';
COMMENT ON COLUMN Direccion.Dir_id IS 'Identificador de la dirección';
COMMENT ON COLUMN Direccion.Usu_id IS 'Usuario dueño de la dirección';
COMMENT ON COLUMN Direccion.Dir_alias IS 'Nombre corto como Casa u Oficina';
COMMENT ON COLUMN Direccion.Dir_calle IS 'Calle principal, número y secundaria';
COMMENT ON COLUMN Direccion.Dir_ciudad IS 'Ciudad de entrega';
COMMENT ON COLUMN Direccion.Dir_referencia IS 'Referencia para el mensajero';
COMMENT ON COLUMN Direccion.Dir_telefono IS 'Celular de contacto para la entrega';
COMMENT ON COLUMN Direccion.Dir_principal IS 'Indica si es la dirección que se propone primero';
COMMENT ON COLUMN Sesion.Ses_id IS 'Identificador de la sesión';
COMMENT ON COLUMN Sesion.Usu_id IS 'Usuario que inició la sesión';
COMMENT ON COLUMN Sesion.Ses_token_hash IS 'Hash SHA-256 del código guardado en la cookie';
COMMENT ON COLUMN Sesion.Ses_creada IS 'Momento en que se inició la sesión';
COMMENT ON COLUMN Sesion.Ses_vence IS 'Momento en que la sesión deja de valer';
COMMENT ON COLUMN RecuperacionClave.Rec_id IS 'Identificador de la solicitud';
COMMENT ON COLUMN RecuperacionClave.Usu_id IS 'Usuario que pidió recuperar su contraseña';
COMMENT ON COLUMN RecuperacionClave.Rec_token_hash IS 'Hash SHA-256 del código enviado por correo';
COMMENT ON COLUMN RecuperacionClave.Rec_vence IS 'Vencimiento del código, 30 minutos después de pedirlo';
COMMENT ON COLUMN RecuperacionClave.Rec_usado IS 'Indica si el código ya se usó';
COMMENT ON COLUMN Marca.Mar_id IS 'Identificador de la marca';
COMMENT ON COLUMN Marca.Mar_nombre IS 'Nombre de la marca';
COMMENT ON COLUMN Familia.Fam_id IS 'Identificador de la familia';
COMMENT ON COLUMN Familia.Fam_codigo IS 'Código corto usado en las URLs y filtros';
COMMENT ON COLUMN Familia.Fam_nombre IS 'Nombre que se muestra en la tienda';
COMMENT ON COLUMN Ocasion.Oca_id IS 'Identificador de la ocasión';
COMMENT ON COLUMN Ocasion.Oca_nombre IS 'Nombre de la ocasión como Oficina o Noche';
COMMENT ON COLUMN Producto.Pro_id IS 'Identificador del perfume';
COMMENT ON COLUMN Producto.Pro_slug IS 'Nombre para la URL, por ejemplo khamrah';
COMMENT ON COLUMN Producto.Pro_nombre IS 'Nombre comercial del perfume';
COMMENT ON COLUMN Producto.Mar_id IS 'Marca del perfume';
COMMENT ON COLUMN Producto.Fam_id IS 'Familia olfativa';
COMMENT ON COLUMN Producto.Pro_publico IS 'Público al que va dirigido';
COMMENT ON COLUMN Producto.Pro_origen IS 'Origen árabe, diseñador o nicho';
COMMENT ON COLUMN Producto.Pro_concentracion IS 'Concentración del perfume';
COMMENT ON COLUMN Producto.Pro_descripcion IS 'Descripción que se muestra en la ficha';
COMMENT ON COLUMN Producto.Pro_oferta IS 'Porcentaje de descuento sobre los frascos, 0 si no está en oferta';
COMMENT ON COLUMN Producto.Pro_novedad IS 'Indica si aparece en Novedades';
COMMENT ON COLUMN Producto.Pro_mas_vendido IS 'Indica si aparece en Más vendidos';
COMMENT ON COLUMN Producto.Pro_activo IS 'Indica si se muestra en la tienda';
COMMENT ON COLUMN ProductoOcasion.Prc_id IS 'Identificador de la relación';
COMMENT ON COLUMN ProductoOcasion.Pro_id IS 'Perfume';
COMMENT ON COLUMN ProductoOcasion.Oca_id IS 'Ocasión en la que se recomienda';
COMMENT ON COLUMN Nota.Not_id IS 'Identificador de la nota';
COMMENT ON COLUMN Nota.Not_nombre IS 'Nombre de la nota como Vainilla o Bergamota';
COMMENT ON COLUMN ProductoNota.Prn_id IS 'Identificador de la relación';
COMMENT ON COLUMN ProductoNota.Pro_id IS 'Perfume';
COMMENT ON COLUMN ProductoNota.Not_id IS 'Nota que contiene';
COMMENT ON COLUMN ProductoNota.Prn_nivel IS 'Nivel de la pirámide, salida, corazón o fondo';
COMMENT ON COLUMN ProductoNota.Prn_orden IS 'Posición de la nota dentro de su nivel';
COMMENT ON COLUMN Acorde.Aco_id IS 'Identificador del acorde';
COMMENT ON COLUMN Acorde.Aco_nombre IS 'Nombre del acorde como Dulce o Amaderado';
COMMENT ON COLUMN ProductoAcorde.Pra_id IS 'Identificador de la relación';
COMMENT ON COLUMN ProductoAcorde.Pro_id IS 'Perfume';
COMMENT ON COLUMN ProductoAcorde.Aco_id IS 'Acorde que tiene';
COMMENT ON COLUMN ProductoAcorde.Pra_valor IS 'Intensidad del acorde de 1 a 100, se dibuja como barra';
COMMENT ON COLUMN Presentacion.Pre_id IS 'Identificador de la presentación';
COMMENT ON COLUMN Presentacion.Pro_id IS 'Perfume al que pertenece';
COMMENT ON COLUMN Presentacion.Pre_tipo IS 'Tipo de presentación, frasco o decant';
COMMENT ON COLUMN Presentacion.Pre_ml IS 'Contenido en mililitros';
COMMENT ON COLUMN Presentacion.Pre_precio IS 'Precio de lista en dólares, sin descuento';
COMMENT ON COLUMN Presentacion.Pre_stock IS 'Unidades disponibles';
COMMENT ON COLUMN Favorito.Fav_id IS 'Identificador del favorito';
COMMENT ON COLUMN Favorito.Usu_id IS 'Usuario que lo guardó';
COMMENT ON COLUMN Favorito.Pro_id IS 'Perfume guardado';
COMMENT ON COLUMN Favorito.Fav_fecha IS 'Momento en que se guardó';
COMMENT ON COLUMN Carrito.Car_id IS 'Identificador del carrito';
COMMENT ON COLUMN Carrito.Usu_id IS 'Usuario dueño del carrito';
COMMENT ON COLUMN Carrito.Car_actualizado IS 'Última vez que cambió';
COMMENT ON COLUMN CarritoItem.Cit_id IS 'Identificador de la línea';
COMMENT ON COLUMN CarritoItem.Car_id IS 'Carrito al que pertenece';
COMMENT ON COLUMN CarritoItem.Pre_id IS 'Presentación elegida';
COMMENT ON COLUMN CarritoItem.Cit_cantidad IS 'Unidades de esa presentación';
COMMENT ON COLUMN Pedido.Ped_id IS 'Identificador del pedido';
COMMENT ON COLUMN Pedido.Ped_numero IS 'Número que ve el cliente, por ejemplo MK-000123';
COMMENT ON COLUMN Pedido.Usu_id IS 'Cuenta que hizo el pedido';
COMMENT ON COLUMN Pedido.Ped_fecha IS 'Momento de la compra, de aquí sale el estado';
COMMENT ON COLUMN Pedido.Ped_entrega IS 'Envío por Servientrega o retiro en el local';
COMMENT ON COLUMN Pedido.Ped_nombre IS 'Nombre de quien recibe';
COMMENT ON COLUMN Pedido.Ped_correo IS 'Correo al que se envía la confirmación';
COMMENT ON COLUMN Pedido.Ped_telefono IS 'Celular de contacto';
COMMENT ON COLUMN Pedido.Ped_subtotal IS 'Suma de las líneas con su precio congelado';
COMMENT ON COLUMN Pedido.Ped_envio IS 'Costo del envío, 0 en retiro o desde 60 dólares';
COMMENT ON COLUMN Pedido.Ped_total IS 'Subtotal más envío';
COMMENT ON COLUMN PedidoItem.Pit_id IS 'Identificador de la línea';
COMMENT ON COLUMN PedidoItem.Ped_id IS 'Pedido al que pertenece';
COMMENT ON COLUMN PedidoItem.Pre_id IS 'Presentación comprada';
COMMENT ON COLUMN PedidoItem.Pit_cantidad IS 'Unidades compradas';
COMMENT ON COLUMN PedidoItem.Pit_precio IS 'Precio unitario cobrado, ya con la oferta';
COMMENT ON COLUMN Pago.Pag_id IS 'Identificador del pago';
COMMENT ON COLUMN Pago.Ped_id IS 'Pedido que se pagó';
COMMENT ON COLUMN Pago.Pag_metodo IS 'Tarjeta o Deuna';
COMMENT ON COLUMN Pago.Pag_ultimos4 IS 'Solo los últimos 4 dígitos de la tarjeta, nunca el número completo';
COMMENT ON COLUMN Pago.Pag_verificacion IS 'Indica si un pago Deuna quedó en verificación';
COMMENT ON COLUMN Pago.Pag_fecha IS 'Momento del pago';
COMMENT ON COLUMN Envio.Env_id IS 'Identificador del envío';
COMMENT ON COLUMN Envio.Ped_id IS 'Pedido que se entrega';
COMMENT ON COLUMN Envio.Env_guia IS 'Número de guía de Servientrega, vacío en retiro';
COMMENT ON COLUMN Envio.Env_calle IS 'Dirección de entrega, vacía en retiro';
COMMENT ON COLUMN Envio.Env_ciudad IS 'Ciudad de entrega, vacía en retiro';
COMMENT ON COLUMN Envio.Env_referencia IS 'Referencia para el mensajero';


-- =========================================================
-- 3. TRIGGERS Y VISTA
-- =========================================================

-- Secuencia para el número de pedido que ve el cliente
CREATE SEQUENCE seq_numero_pedido START WITH 1 INCREMENT BY 1;

-- Genera el número del pedido con el formato MK-000001
CREATE FUNCTION fn_numero_pedido() RETURNS TRIGGER AS $$
BEGIN
  NEW.Ped_numero := 'MK-' || LPAD(NEXTVAL('seq_numero_pedido')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_numero
  BEFORE INSERT ON Pedido
  FOR EACH ROW EXECUTE FUNCTION fn_numero_pedido();

-- Descuenta el stock al guardar cada línea del pedido
-- Si no alcanza lanza un error y la transacción del checkout se deshace completa
CREATE FUNCTION fn_descontar_stock() RETURNS TRIGGER AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  UPDATE Presentacion
     SET Pre_stock = Pre_stock - NEW.Pit_cantidad
   WHERE Pre_id = NEW.Pre_id
     AND Pre_stock >= NEW.Pit_cantidad;
  IF NOT FOUND THEN
    SELECT P.Pro_nombre || ' ' || R.Pre_ml || ' ml' INTO v_nombre
      FROM Presentacion R JOIN Producto P ON P.Pro_id = R.Pro_id
     WHERE R.Pre_id = NEW.Pre_id;
    RAISE EXCEPTION 'No hay stock suficiente de %', v_nombre USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pedido_item_stock
  AFTER INSERT ON PedidoItem
  FOR EACH ROW EXECUTE FUNCTION fn_descontar_stock();

-- Deja una sola dirección principal por usuario
CREATE FUNCTION fn_direccion_principal() RETURNS TRIGGER AS $$
BEGIN
  UPDATE Direccion
     SET Dir_principal = FALSE
   WHERE Usu_id = NEW.Usu_id
     AND Dir_id <> NEW.Dir_id
     AND Dir_principal = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_direccion_principal
  AFTER INSERT OR UPDATE OF Dir_principal ON Direccion
  FOR EACH ROW WHEN (NEW.Dir_principal = TRUE)
  EXECUTE FUNCTION fn_direccion_principal();

-- Limita los decants a 10 unidades por tamaño y por perfume en el carrito
CREATE FUNCTION fn_limite_decant() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.Cit_cantidad > 10 AND EXISTS (
       SELECT 1 FROM Presentacion WHERE Pre_id = NEW.Pre_id AND Pre_tipo = 'decant') THEN
    RAISE EXCEPTION 'Puedes llevar hasta 10 decants de cada tamaño' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_carrito_item_decant
  BEFORE INSERT OR UPDATE ON CarritoItem
  FOR EACH ROW EXECUTE FUNCTION fn_limite_decant();

-- Estado del pedido calculado con el tiempo desde la compra
-- No hay panel de administración, así el ciclo completo se ve mientras se revisa la tienda
CREATE VIEW Vista_pedido AS
SELECT P.Ped_id,
       P.Ped_numero,
       P.Usu_id,
       P.Ped_fecha,
       P.Ped_entrega,
       P.Ped_total,
       G.Pag_metodo,
       E.Env_guia,
       CASE
         WHEN G.Pag_verificacion AND NOW() - P.Ped_fecha < INTERVAL '2 minutes' THEN 'Pago en verificación'
         WHEN NOW() - P.Ped_fecha < INTERVAL '5 minutes' THEN 'En preparación'
         WHEN NOW() - P.Ped_fecha < INTERVAL '15 minutes' AND P.Ped_entrega = 'envio' THEN 'En camino'
         WHEN NOW() - P.Ped_fecha < INTERVAL '15 minutes' THEN 'Listo para retirar'
         ELSE 'Entregado'
       END AS Ped_estado
  FROM Pedido P
  JOIN Pago G ON G.Ped_id = P.Ped_id
  LEFT JOIN Envio E ON E.Ped_id = P.Ped_id;

BEGIN;

-- =========================================================
-- 4. DATOS DEL CATÁLOGO
-- 70 perfumes ficticios con sus presentaciones
-- =========================================================

-- Marcas
INSERT INTO Marca (Mar_nombre) VALUES
  ('Acqua di Parma'),
  ('Afnan'),
  ('Al Haramain'),
  ('Al Wataniah'),
  ('Armaf'),
  ('Bharara'),
  ('Calvin Klein'),
  ('Carolina Herrera'),
  ('Chanel'),
  ('Creed'),
  ('Dior'),
  ('Dolce & Gabbana'),
  ('Emporio Armani'),
  ('Escentric Molecules'),
  ('Frédéric Malle'),
  ('Giardini di Toscana'),
  ('Giorgio Armani'),
  ('Guerlain'),
  ('Hermès'),
  ('Initio'),
  ('Jean Paul Gaultier'),
  ('Kilian'),
  ('Lalique'),
  ('Lancôme'),
  ('Lattafa'),
  ('Le Labo'),
  ('Maison Francis Kurkdjian'),
  ('Nautica'),
  ('Nishane'),
  ('Paco Rabanne'),
  ('Parfums de Marly'),
  ('Paris Hilton'),
  ('Prada'),
  ('Rasasi'),
  ('Swiss Arabian'),
  ('Tom Ford'),
  ('Valentino'),
  ('Versace'),
  ('Viktor&Rolf'),
  ('Xerjoff'),
  ('Yves Saint Laurent');

-- Familias olfativas
INSERT INTO Familia (Fam_codigo, Fam_nombre) VALUES
  ('citrico', 'Cítrico y fresco'),
  ('floral', 'Floral'),
  ('amaderado', 'Amaderado'),
  ('oriental', 'Oriental y ámbar'),
  ('gourmand', 'Gourmand'),
  ('aromatico', 'Aromático'),
  ('cuero', 'Cuero y especiado');

-- Ocasiones
INSERT INTO Ocasion (Oca_nombre) VALUES
  ('Oficina'),
  ('Diario'),
  ('Citas'),
  ('Noche'),
  ('Verano'),
  ('Eventos');

-- Notas olfativas
INSERT INTO Nota (Not_nombre) VALUES
  ('Abedul'),
  ('Abeto'),
  ('Acorde gourmand'),
  ('Agarwood'),
  ('Albahaca'),
  ('Almendra'),
  ('Almendra amarga'),
  ('Almizcle'),
  ('Almizcle blanco'),
  ('Ámbar'),
  ('Ámbar gris'),
  ('Ambrette'),
  ('Ambrox'),
  ('Ambroxan'),
  ('Anís estrellado'),
  ('Ante'),
  ('Azafrán'),
  ('Azahar'),
  ('Azúcar'),
  ('Bambú'),
  ('Bayas de enebro'),
  ('Benjuí'),
  ('Bergamota'),
  ('Cacao'),
  ('Cachemira'),
  ('Café'),
  ('Campanilla'),
  ('Canela'),
  ('Caña de azúcar'),
  ('Caramelo'),
  ('Cardamomo'),
  ('Cedro'),
  ('Cilantro'),
  ('Ciprés'),
  ('Ciruela'),
  ('Clavo'),
  ('Coco'),
  ('Comino'),
  ('Coñac'),
  ('Cuero'),
  ('Dátiles'),
  ('Durazno'),
  ('Enebro'),
  ('Flor de algodón'),
  ('Frambuesa'),
  ('Fresia'),
  ('Frutas confitadas'),
  ('Frutas tropicales'),
  ('Frutos rojos'),
  ('Gardenia'),
  ('Geranio'),
  ('Grosella negra'),
  ('Guayaco'),
  ('Haba tonka'),
  ('Heliotropo'),
  ('Hibisco'),
  ('Hoja verde'),
  ('Incienso'),
  ('Iris'),
  ('Iso E Super'),
  ('Jacinto'),
  ('Jazmín'),
  ('Jazmín sambac'),
  ('Jengibre'),
  ('Laurel'),
  ('Lavanda'),
  ('Lavanda silvestre'),
  ('Leche'),
  ('Lichi'),
  ('Lima'),
  ('Limón'),
  ('Limón siciliano'),
  ('Lirio'),
  ('Lirio de los valles'),
  ('Loto'),
  ('Madera ambarada'),
  ('Madera de cachemir'),
  ('Madera de cedro'),
  ('Madera de deriva'),
  ('Madreselva'),
  ('Mandarina'),
  ('Mandarina verde'),
  ('Manzana'),
  ('Manzana verde'),
  ('Melón'),
  ('Membrillo'),
  ('Menta'),
  ('Miel'),
  ('Mimosa'),
  ('Mirra'),
  ('Musgo'),
  ('Musgo de roble'),
  ('Naranja'),
  ('Naranja amarga'),
  ('Naranja dulce'),
  ('Nardo'),
  ('Neroli'),
  ('Notas amaderadas'),
  ('Notas marinas'),
  ('Notas metálicas'),
  ('Notas verdes'),
  ('Nuez moscada'),
  ('Olíbano'),
  ('Orquídea'),
  ('Oud'),
  ('Pachulí'),
  ('Palisandro'),
  ('Pedernal'),
  ('Peonía'),
  ('Pera'),
  ('Pimienta'),
  ('Pimienta negra'),
  ('Pimienta rosa'),
  ('Piña'),
  ('Pomelo'),
  ('Praliné'),
  ('Roble'),
  ('Romero'),
  ('Ron blanco'),
  ('Rosa'),
  ('Rosa blanca'),
  ('Rosa búlgara'),
  ('Rosa turca'),
  ('Ruibarbo'),
  ('Sal mineral'),
  ('Salvia'),
  ('Sándalo'),
  ('Tabaco'),
  ('Té verde'),
  ('Tomillo'),
  ('Vainilla'),
  ('Vainilla de Madagascar'),
  ('Verbena'),
  ('Vetiver'),
  ('Vetiver de Bourbon'),
  ('Vetiver de Haití'),
  ('Violeta'),
  ('Ylang ylang');

-- Acordes
INSERT INTO Acorde (Aco_nombre) VALUES
  ('Acuático'),
  ('Afrutado'),
  ('Ahumado'),
  ('Almendrado'),
  ('Almizclado'),
  ('Amaderado'),
  ('Ámbar'),
  ('Aromático'),
  ('Atabacado'),
  ('Atalcado'),
  ('Cacao'),
  ('Cálido especiado'),
  ('Cítrico'),
  ('Cuero'),
  ('Dulce'),
  ('Especiado'),
  ('Floral'),
  ('Floral blanco'),
  ('Fresco'),
  ('Fresco especiado'),
  ('Frutal'),
  ('Lavanda'),
  ('Limpio'),
  ('Marino'),
  ('Meloso'),
  ('Salado'),
  ('Vainilla'),
  ('Verde');

-- Khamrah, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('khamrah', 'Khamrah', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'unisex', 'arabe', 'Eau de Parfum',
        'Khamrah es una fragancia ámbar especiada y gourmand pensada para el frío y la noche. Abre cálida con canela, nuez moscada y un toque de bergamota, y en el corazón los dátiles y el praliné le dan un dulzor que recuerda a un postre árabe. El fondo de vainilla, haba tonka y benjuí deja una estela envolvente.',
        20, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), 'frasco', 50, 34.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), 'frasco', 100, 48.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), 'decant', 2, 3.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), 'decant', 5, 7.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), 'decant', 10, 12.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nuez moscada'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Dátiles'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Praliné'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nardo'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 78),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 60);

-- Asad, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('asad', 'Asad', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'hombre', 'arabe', 'Eau de Parfum',
        'Asad es un ámbar especiado intenso y masculino. La pimienta negra y la piña abren con fuerza junto a un matiz de tabaco, el café y el pachulí le dan carácter en el corazón, y la vainilla con ámbar y benjuí cierra con calidez. Es una opción segura para salidas nocturnas y días fríos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), 'frasco', 50, 26.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), 'frasco', 100, 36.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta negra'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tabaco'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Café'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iris'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 82),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'asad'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Atabacado'), 55);

-- Club de Nuit Intense, Armaf
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('club-de-nuit', 'Club de Nuit Intense', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Armaf'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'hombre', 'arabe', 'Eau de Toilette',
        'Club de Nuit Intense combina cítricos y frutas con un fondo ahumado. Abre con limón, piña y grosella negra, el abedul aporta su toque ahumado entre jazmín y rosa, y el almizcle con ámbar gris y vainilla deja una estela intensa. Es una fragancia de noche con mucha presencia.',
        15, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), 'frasco', 50, 30.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), 'frasco', 100, 42.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Grosella negra'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Abedul'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar gris'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'club-de-nuit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- Hawas for Him, Rasasi
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('hawas', 'Hawas for Him', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Rasasi'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'hombre', 'arabe', 'Eau de Parfum',
        'Hawas for Him es una fragancia acuática y afrutada que se siente fresca y luminosa. La manzana y la bergamota abren con frescor, la ciruela y el cardamomo suman un matiz dulce y especiado, y el fondo de ámbar gris, almizcle y madera de deriva recuerda al mar. Ideal para el día y el clima cálido.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), 'frasco', 50, 36.00, 8),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), 'frasco', 100, 52.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), 'decant', 2, 3.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), 'decant', 5, 7.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), 'decant', 10, 12.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Verano', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ciruela'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar gris'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Madera de deriva'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Acuático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 82),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 75),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hawas'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 50);

-- 9PM, Afnan
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('9pm', '9PM', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Afnan'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'hombre', 'arabe', 'Eau de Parfum',
        '9PM es una fragancia dulce y avainillada hecha para la fiesta. Abre con manzana, canela y lavanda silvestre, pasa por un corazón floral de azahar y lirio de los valles, y termina en vainilla, haba tonka y pachulí. Es un aroma juvenil que se nota en la noche.',
        25, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), 'frasco', 50, 28.00, 12),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), 'frasco', 100, 39.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda silvestre'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lirio de los valles'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 85),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9pm'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Lavanda'), 55);

-- Yara, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('yara', 'Yara', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'mujer', 'arabe', 'Eau de Parfum',
        'Yara es una fragancia atalcada y dulce, suave y femenina. La orquídea, el heliotropo y la mandarina abren con delicadeza, el corazón de frutas tropicales le da un toque gourmand y el fondo de vainilla, almizcle y sándalo la vuelve cremosa. Funciona tanto para el día como para una cita.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), 'frasco', 50, 24.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), 'frasco', 100, 34.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Orquídea'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Heliotropo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Acorde gourmand'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frutas tropicales'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Atalcado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 90),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'yara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 60);

-- Ana Abiyedh, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('ana-abiyedh', 'Ana Abiyedh', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'unisex', 'arabe', 'Eau de Parfum',
        'Ana Abiyedh es un aroma almizclado y limpio con sensación de ropa recién lavada. La pera y la bergamota abren frescas, el almizcle blanco y la flor de algodón forman su corazón, y el sándalo con ámbar le da un fondo suave. Es discreto y versátil para la oficina y los días de calor.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), 'frasco', 50, 22.00, 0),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), 'frasco', 100, 30.00, 0),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina', 'Verano');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pera'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle blanco'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Flor de algodón'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Limpio'), 85),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Atalcado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ana-abiyedh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 45);

-- Sauvage, Dior
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('sauvage', 'Sauvage', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Dior'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Parfum',
        'Sauvage es una fragancia fresca, especiada y aromática. La bergamota y la pimienta abren con energía, la lavanda, el anís estrellado y la nuez moscada aportan el carácter aromático, y el ambroxan con vainilla deja un fondo ambarado y moderno. Es una opción versátil para la oficina y el día.',
        10, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), 'frasco', 50, 118.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), 'frasco', 100, 158.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), 'decant', 5, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), 'decant', 10, 20.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Anís estrellado'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nuez moscada'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ambroxan'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 85),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sauvage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 55);

-- Le Male Elixir, Jean Paul Gaultier
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('le-male-elixir', 'Le Male Elixir', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Jean Paul Gaultier'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'hombre', 'disenador', 'Parfum',
        'Le Male Elixir es un perfume dulce y meloso en concentración Parfum. La lavanda y la menta abren con frescura, la vainilla y el benjuí lo vuelven cálido, y la miel, el haba tonka y el tabaco le dan un fondo denso. Es una fragancia para la noche y el invierno.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), 'frasco', 50, 112.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), 'frasco', 100, 148.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), 'decant', 5, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), 'decant', 10, 20.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Menta'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Miel'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tabaco'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Meloso'), 85),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Lavanda'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'le-male-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Atabacado'), 60);

-- Born in Roma Uomo, Valentino
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('born-in-roma', 'Born in Roma Uomo', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Valentino'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Born in Roma Uomo es una fragancia amaderada con un toque salado y mineral. Abre con sal mineral y violeta, la salvia aporta frescura aromática en el corazón y el vetiver le da un fondo verde y elegante. Es un aroma sobrio, pensado para el día y la oficina.',
        15, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), 'frasco', 50, 98.00, 7),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), 'frasco', 100, 132.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), 'decant', 5, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), 'decant', 10, 18.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sal mineral'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Violeta'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Salvia'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 1);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Salado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'born-in-roma'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Verde'), 50);

-- Libre, Yves Saint Laurent
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('libre', 'Libre', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Yves Saint Laurent'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Libre es un floral con lavanda que equilibra frescura y calidez. La lavanda, la mandarina y la grosella negra abren con brillo, el jazmín y el azahar forman su corazón floral blanco, y la vainilla de Madagascar con almizcle y cedro cierra suave. Es elegante para la oficina y el día.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), 'frasco', 50, 115.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), 'frasco', 100, 152.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), 'decant', 5, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), 'decant', 10, 20.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Grosella negra'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla de Madagascar'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Lavanda'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral blanco'), 85),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 75),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'libre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 50);

-- Good Girl, Carolina Herrera
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('good-girl', 'Good Girl', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Carolina Herrera'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Good Girl es un floral gourmand que juega con el contraste entre lo dulce y lo intenso. La almendra y el café abren con fuerza, el nardo y el jazmín sambac aportan un corazón floral blanco, y el haba tonka con cacao deja un fondo cálido. Es una fragancia para la noche, las fiestas y las citas.',
        20, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), 'frasco', 50, 102.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), 'frasco', 100, 138.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), 'decant', 5, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), 'decant', 10, 18.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almendra'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Café'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nardo'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín sambac'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cacao'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral blanco'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cacao'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'good-girl'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almendrado'), 60);

-- Acqua di Giò, Giorgio Armani
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('acqua-di-gio', 'Acqua di Giò', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Giorgio Armani'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Acqua di Giò es una fragancia cítrica y fresca, luminosa y ligera. Abre con bergamota, limón y notas marinas, en el corazón jazmín y romero le dan su personalidad, y el fondo de cedro, almizcle blanco y pachulí deja una estela limpia. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el día a día, el verano y la oficina.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), 'frasco', 50, 95.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), 'frasco', 100, 128.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), 'decant', 5, 9.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), 'decant', 10, 16.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Verano', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas marinas'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Romero'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle blanco'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 52);

-- Light Blue, Dolce & Gabbana
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('light-blue', 'Light Blue', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Dolce & Gabbana'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'mujer', 'disenador', 'Eau de Toilette',
        'Light Blue es una fragancia cítrica y fresca, luminosa y ligera. Abre con limón siciliano, manzana y campanilla, en el corazón bambú, jazmín y rosa blanca le dan su personalidad, y el fondo de cedro, ámbar y almizcle deja una estela limpia. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el verano y el día a día.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), 'frasco', 50, 90.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), 'frasco', 100, 122.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), 'decant', 2, 4.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), 'decant', 5, 9.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), 'decant', 10, 15.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Verano', 'Diario');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón siciliano'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Campanilla'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bambú'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa blanca'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'light-blue'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 55);

-- Acqua di Giò Profondo, Giorgio Armani
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('acqua-di-gio-profondo', 'Acqua di Giò Profondo', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Giorgio Armani'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'hombre', 'disenador', 'Eau de Parfum',
        'Acqua di Giò Profondo es la versión más intensa y profunda del clásico de Armani. Abre con notas marinas, bergamota y mandarina verde, en el corazón el romero, la lavanda y el ciprés le dan un toque aromático, y el fondo de almizcle, pachulí y ámbar hace que dure más que el original. Funciona muy bien para el verano, la oficina y el día a día.',
        20, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), 'frasco', 50, 72.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), 'frasco', 100, 98.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), 'decant', 2, 3.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), 'decant', 5, 7.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), 'decant', 10, 12.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Verano', 'Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas marinas'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina verde'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Romero'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ciprés'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Marino'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 82),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'acqua-di-gio-profondo'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 52);

-- Neroli Portofino, Tom Ford
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('neroli-portofino', 'Neroli Portofino', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Tom Ford'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'unisex', 'nicho', 'Eau de Parfum',
        'Neroli Portofino es una fragancia cítrica y fresca, luminosa y ligera. Abre con bergamota, mandarina y limón, en el corazón neroli, azahar y lavanda le dan su personalidad, y el fondo de ámbar, almizcle y ambrette deja una estela limpia. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el verano y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), 'frasco', 50, 236.00, 12),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), 'frasco', 100, 380.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), 'decant', 2, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), 'decant', 5, 24.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), 'decant', 10, 40.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Verano', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Neroli'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ambrette'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'neroli-portofino'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 61);

-- Virgin Island Water, Creed
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('virgin-island-water', 'Virgin Island Water', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Creed'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'unisex', 'nicho', 'Eau de Parfum',
        'Virgin Island Water es una fragancia cítrica y fresca, luminosa y ligera. Abre con lima, coco y bergamota, en el corazón jengibre, ylang ylang y hibisco le dan su personalidad, y el fondo de ron blanco, caña de azúcar y almizcle deja una estela limpia. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el verano y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), 'frasco', 50, 223.00, 8),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), 'frasco', 100, 360.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), 'decant', 2, 11.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), 'decant', 5, 22.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), 'decant', 10, 38.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Verano', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lima'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Coco'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ylang ylang'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Hibisco'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ron blanco'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Caña de azúcar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'virgin-island-water'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 52);

-- Colonia, Acqua di Parma
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('colonia', 'Colonia', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Acqua di Parma'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'unisex', 'nicho', 'Eau de Toilette',
        'Colonia es una fragancia cítrica y fresca, luminosa y ligera. Abre con limón, naranja dulce y bergamota, en el corazón lavanda, rosa y verbena le dan su personalidad, y el fondo de vetiver, sándalo y pachulí deja una estela limpia. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la oficina y el día a día.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), 'frasco', 50, 167.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), 'frasco', 100, 270.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), 'decant', 2, 8.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), 'decant', 5, 17.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), 'decant', 10, 28.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Diario');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Naranja dulce'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Verbena'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'colonia'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 55);

-- 9AM, Afnan
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('9am', '9AM', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Afnan'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'hombre', 'arabe', 'Eau de Parfum',
        '9AM es una fragancia cítrica y fresca, luminosa y ligera. Abre con pomelo, bergamota y menta, en el corazón lavanda, jengibre y té verde le dan su personalidad, y el fondo de almizcle, cedro y ámbar deja una estela limpia. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para el día a día, la oficina y el verano.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), 'frasco', 100, 38.00, 11),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina', 'Verano');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Menta'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Té verde'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = '9am'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 58);

-- King, Bharara
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('king-bharara', 'King', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Bharara'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'hombre', 'arabe', 'Eau de Parfum',
        'King es una fragancia cítrica y fresca, luminosa y ligera. Abre con naranja, limón y bergamota, en el corazón lavanda, salvia y pimienta rosa le dan su personalidad, y el fondo de vainilla, ámbar y almizcle deja una estela limpia. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para los eventos y el verano.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), 'frasco', 100, 52.00, 7),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Eventos', 'Verano');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Naranja'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Salvia'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta rosa'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'king-bharara'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 61);

-- CK One, Calvin Klein
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('ck-one', 'CK One', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Calvin Klein'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'citrico'),
        'unisex', 'disenador', 'Eau de Toilette',
        'CK One es una fragancia cítrica y fresca, luminosa y ligera. Abre con limón, bergamota y piña, en el corazón té verde, jazmín y lirio le dan su personalidad, y el fondo de almizcle, cedro y ámbar deja una estela limpia. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el día a día y el verano.',
        25, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), 'frasco', 50, 56.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), 'frasco', 100, 76.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), 'decant', 5, 5.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), 'decant', 10, 9.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Verano');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Té verde'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lirio'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ck-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 52);

-- J'adore, Dior
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('jadore', 'J''adore', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Dior'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'disenador', 'Eau de Parfum',
        'J''adore es un perfume floral, suave y elegante. Abre con pera, melón y bergamota, en el corazón jazmín sambac, rosa y ylang ylang le dan su personalidad, y el fondo de vainilla, almizcle y cedro deja una estela delicada. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para los eventos y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), 'frasco', 50, 124.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), 'frasco', 100, 168.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), 'decant', 5, 12.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), 'decant', 10, 21.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Eventos', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pera'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Melón'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín sambac'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ylang ylang'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'jadore'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 55);

-- Chance Eau Tendre, Chanel
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('chance-eau-tendre', 'Chance Eau Tendre', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Chanel'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'disenador', 'Eau de Toilette',
        'Chance Eau Tendre es un perfume floral, suave y elegante. Abre con pomelo y membrillo, en el corazón jazmín y jacinto le dan su personalidad, y el fondo de almizcle blanco, iris y ámbar deja una estela delicada. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el día a día y la oficina.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), 'frasco', 50, 127.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), 'frasco', 100, 172.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), 'decant', 2, 6.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), 'decant', 5, 13.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), 'decant', 10, 21.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Membrillo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jacinto'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle blanco'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iris'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'chance-eau-tendre'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 58);

-- Delina, Parfums de Marly
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('delina', 'Delina', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Parfums de Marly'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'nicho', 'Eau de Parfum',
        'Delina es un perfume floral, suave y elegante. Abre con lichi, ruibarbo y bergamota, en el corazón rosa turca, peonía y vainilla le dan su personalidad, y el fondo de cachemira, almizcle y incienso deja una estela delicada. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para las citas y los eventos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), 'frasco', 50, 211.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), 'frasco', 100, 340.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), 'decant', 2, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), 'decant', 5, 21.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), 'decant', 10, 36.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Citas', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lichi'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ruibarbo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa turca'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Peonía'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cachemira'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'delina'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 61);

-- Rose 31, Le Labo
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('rose-31', 'Rose 31', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Le Labo'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'unisex', 'nicho', 'Eau de Parfum',
        'Rose 31 es un perfume floral, suave y elegante. Abre con rosa y comino, en el corazón cedro y agarwood le dan su personalidad, y el fondo de almizcle, ámbar y vetiver deja una estela delicada. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el día a día y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), 'frasco', 50, 192.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), 'frasco', 100, 310.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), 'decant', 2, 9.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), 'decant', 5, 19.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), 'decant', 10, 32.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Comino'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Agarwood'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'rose-31'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 52);

-- Mayar, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('mayar', 'Mayar', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'arabe', 'Eau de Parfum',
        'Mayar es un perfume floral, suave y elegante. Abre con lichi, frambuesa y pera, en el corazón rosa, jazmín y peonía le dan su personalidad, y el fondo de vainilla, almizcle y sándalo deja una estela delicada. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para el día a día y las citas.',
        15, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), 'frasco', 100, 36.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lichi'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frambuesa'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pera'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Peonía'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'mayar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 55);

-- Sabah Al Ward, Al Wataniah
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('sabah-al-ward', 'Sabah Al Ward', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Al Wataniah'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'arabe', 'Eau de Parfum',
        'Sabah Al Ward es un perfume floral, suave y elegante. Abre con mandarina y frutos rojos, en el corazón rosa, jazmín y gardenia le dan su personalidad, y el fondo de almizcle, vainilla y ámbar deja una estela delicada. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para el día a día y la oficina.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), 'frasco', 100, 34.00, 12);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frutos rojos'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Gardenia'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'sabah-al-ward'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 58);

-- Paris Hilton, Paris Hilton
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('paris-hilton', 'Paris Hilton', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Paris Hilton'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Paris Hilton es una fragancia floral frutal, alegre y juvenil. Abre con melón, manzana verde y durazno, en el corazón la fresia, la mimosa y el jazmín le dan un aire femenino, y el fondo de ylang ylang, sándalo y musgo de roble deja una estela suave. Es un clásico que sigue siendo de los más pedidos. Funciona muy bien para el día a día, una cita o una tarde de verano.',
        15, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), 'frasco', 100, 38.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), 'decant', 2, 2.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), 'decant', 5, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), 'decant', 10, 8.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas', 'Verano');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Melón'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana verde'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Durazno'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Fresia'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mimosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ylang ylang'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Musgo de roble'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Frutal'), 88),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'paris-hilton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 55);

-- Portrait of a Lady, Frédéric Malle
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('portrait-of-a-lady', 'Portrait of a Lady', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Frédéric Malle'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'floral'),
        'mujer', 'nicho', 'Parfum',
        'Portrait of a Lady es un perfume floral, suave y elegante. Abre con grosella negra, frambuesa y canela, en el corazón rosa turca y clavo le dan su personalidad, y el fondo de pachulí, incienso y sándalo deja una estela delicada. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), 'frasco', 50, 260.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), 'frasco', 100, 420.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), 'decant', 2, 13.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), 'decant', 5, 26.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), 'decant', 10, 44.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Grosella negra'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frambuesa'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa turca'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Clavo'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Floral'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Afrutado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Almizclado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'portrait-of-a-lady'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 52);

-- Terre d'Hermès, Hermès
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('terre-hermes', 'Terre d''Hermès', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Hermès'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Terre d''Hermès es una fragancia amaderada, sobria y con mucha presencia. Abre con naranja y pomelo, en el corazón pimienta, geranio y pedernal le dan su personalidad, y el fondo de vetiver, cedro y benjuí deja una estela seca y elegante. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la oficina y el día a día.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), 'frasco', 50, 104.00, 11),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), 'frasco', 100, 140.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), 'decant', 5, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), 'decant', 10, 17.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Diario');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Naranja'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Geranio'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pedernal'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'terre-hermes'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 55);

-- Bleu de Chanel, Chanel
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('bleu-de-chanel', 'Bleu de Chanel', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Chanel'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'hombre', 'disenador', 'Parfum',
        'Bleu de Chanel es una fragancia amaderada, sobria y con mucha presencia. Abre con limón, bergamota y menta, en el corazón pimienta rosa, jengibre y jazmín le dan su personalidad, y el fondo de sándalo, cedro y incienso deja una estela seca y elegante. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la oficina y las citas.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), 'frasco', 50, 132.00, 7),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), 'frasco', 100, 178.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), 'decant', 2, 6.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), 'decant', 5, 13.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), 'decant', 10, 22.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Menta'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta rosa'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bleu-de-chanel'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 58);

-- Santal 33, Le Labo
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('santal-33', 'Santal 33', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Le Labo'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'unisex', 'nicho', 'Eau de Parfum',
        'Santal 33 es una fragancia amaderada, sobria y con mucha presencia. Abre con cardamomo y violeta, en el corazón iris y ambrox le dan su personalidad, y el fondo de sándalo, cedro y cuero deja una estela seca y elegante. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el día a día y las citas.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), 'frasco', 50, 205.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), 'frasco', 100, 330.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), 'decant', 2, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), 'decant', 5, 21.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), 'decant', 10, 35.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Violeta'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iris'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ambrox'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cuero'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'santal-33'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 61);

-- Baccarat Rouge 540, Maison Francis Kurkdjian
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('baccarat-rouge', 'Baccarat Rouge 540', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Maison Francis Kurkdjian'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'unisex', 'nicho', 'Extrait',
        'Baccarat Rouge 540 es una fragancia amaderada, sobria y con mucha presencia. Abre con azafrán y jazmín, en el corazón madera ambarada y ámbar gris le dan su personalidad, y el fondo de abeto, cedro y almizcle deja una estela seca y elegante. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para los eventos y la noche.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), 'frasco', 50, 254.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), 'frasco', 100, 410.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), 'decant', 2, 12.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), 'decant', 5, 26.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), 'decant', 10, 43.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Eventos', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Madera ambarada'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar gris'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Abeto'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'baccarat-rouge'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 52);

-- Encre Noire, Lalique
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('encre-noire', 'Encre Noire', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lalique'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Encre Noire es una fragancia amaderada, sobria y con mucha presencia. Abre con ciprés y bergamota, en el corazón vetiver de Haití y vetiver de Bourbon le dan su personalidad, y el fondo de almizcle, cachemira y madera de cachemir deja una estela seca y elegante. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la oficina y la noche.',
        30, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), 'frasco', 50, 53.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), 'frasco', 100, 72.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), 'decant', 5, 5.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), 'decant', 10, 9.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ciprés'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver de Haití'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver de Bourbon'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cachemira'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Madera de cachemir'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'encre-noire'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 55);

-- Ameer Al Oudh, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('ameer-al-oudh', 'Ameer Al Oudh', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'unisex', 'arabe', 'Parfum',
        'Ameer Al Oudh es una fragancia amaderada, sobria y con mucha presencia. Abre con azúcar y notas amaderadas, en el corazón oud, agarwood y sándalo le dan su personalidad, y el fondo de vainilla, almizcle y ámbar deja una estela seca y elegante. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), 'frasco', 100, 40.00, 2);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azúcar'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas amaderadas'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Agarwood'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ameer-al-oudh'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 58);

-- Oud Wood, Tom Ford
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('oud-wood', 'Oud Wood', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Tom Ford'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'unisex', 'nicho', 'Extrait',
        'Oud Wood es una fragancia amaderada, sobria y con mucha presencia. Abre con palisandro, cardamomo y pimienta, en el corazón oud, sándalo y vetiver le dan su personalidad, y el fondo de haba tonka, vainilla y ámbar deja una estela seca y elegante. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), 'frasco', 50, 245.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), 'frasco', 100, 395.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), 'decant', 2, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), 'decant', 5, 25.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), 'decant', 10, 41.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Palisandro'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-wood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 61);

-- Hayaati, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('hayaati', 'Hayaati', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'hombre', 'arabe', 'Eau de Parfum',
        'Hayaati es una fragancia amaderada, sobria y con mucha presencia. Abre con manzana, bergamota y canela, en el corazón cedro, lavanda y geranio le dan su personalidad, y el fondo de vetiver, almizcle y ámbar deja una estela seca y elegante. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para el día a día y la oficina.',
        20, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), 'frasco', 100, 32.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Geranio'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hayaati'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 52);

-- Molecule 01, Escentric Molecules
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('molecule-01', 'Molecule 01', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Escentric Molecules'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'amaderado'),
        'unisex', 'nicho', 'Eau de Toilette',
        'Molecule 01 es una fragancia amaderada, sobria y con mucha presencia. Abre con Iso E Super, en el corazón notas amaderadas le dan su personalidad, y el fondo de cedro deja una estela seca y elegante. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el día a día y la oficina.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), 'frasco', 50, 112.00, 12),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), 'frasco', 100, 180.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), 'decant', 2, 5.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), 'decant', 5, 11.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), 'decant', 10, 19.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iso E Super'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas amaderadas'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 1);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'molecule-01'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 55);

-- Shalimar, Guerlain
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('shalimar', 'Shalimar', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Guerlain'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Shalimar es un oriental ambarado, cálido y envolvente. Abre con bergamota, limón y mandarina, en el corazón iris, jazmín y rosa le dan su personalidad, y el fondo de vainilla, haba tonka y incienso deja una estela cálida. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), 'frasco', 50, 117.00, 8),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), 'frasco', 100, 158.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), 'decant', 5, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), 'decant', 10, 20.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iris'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shalimar'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- Opium, Yves Saint Laurent
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('opium', 'Opium', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Yves Saint Laurent'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Opium es un oriental ambarado, cálido y envolvente. Abre con mandarina, ciruela y clavo, en el corazón jazmín, rosa y canela le dan su personalidad, y el fondo de incienso, mirra y vainilla deja una estela cálida. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), 'frasco', 50, 115.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), 'frasco', 100, 155.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), 'decant', 2, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), 'decant', 5, 11.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), 'decant', 10, 19.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ciruela'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Clavo'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mirra'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 61);

-- Amber Oud Gold Edition, Al Haramain
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('amber-oud-gold', 'Amber Oud Gold Edition', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Al Haramain'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'unisex', 'arabe', 'Parfum',
        'Amber Oud Gold Edition es un oriental ambarado, cálido y envolvente. Abre con bergamota, melón y piña, en el corazón ámbar y notas verdes le dan su personalidad, y el fondo de vainilla, almizcle y notas amaderadas deja una estela cálida. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y los eventos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), 'frasco', 100, 56.00, 11),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Melón'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas verdes'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas amaderadas'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'amber-oud-gold'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 52);

-- Oud Satin Mood, Maison Francis Kurkdjian
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('oud-satin-mood', 'Oud Satin Mood', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Maison Francis Kurkdjian'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'unisex', 'nicho', 'Extrait',
        'Oud Satin Mood es un oriental ambarado, cálido y envolvente. Abre con violeta y rosa búlgara, en el corazón oud y benjuí le dan su personalidad, y el fondo de vainilla, ámbar y almizcle deja una estela cálida. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), 'frasco', 50, 257.00, 7),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), 'frasco', 100, 415.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), 'decant', 2, 13.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), 'decant', 5, 26.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), 'decant', 10, 43.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Violeta'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa búlgara'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-satin-mood'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 55);

-- Grand Soir, Maison Francis Kurkdjian
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('grand-soir', 'Grand Soir', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Maison Francis Kurkdjian'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'unisex', 'nicho', 'Extrait',
        'Grand Soir es un oriental ambarado, cálido y envolvente. Abre con lavanda y ciprés, en el corazón ámbar y benjuí le dan su personalidad, y el fondo de vainilla, haba tonka y almizcle deja una estela cálida. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), 'frasco', 50, 205.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), 'frasco', 100, 330.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), 'decant', 2, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), 'decant', 5, 21.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), 'decant', 10, 35.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ciprés'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'grand-soir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- The One, Dolce & Gabbana
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('the-one', 'The One', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Dolce & Gabbana'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'hombre', 'disenador', 'Eau de Parfum',
        'The One es un oriental ambarado, cálido y envolvente. Abre con pomelo, cilantro y albahaca, en el corazón jengibre, cardamomo y azahar le dan su personalidad, y el fondo de ámbar, tabaco y cedro deja una estela cálida. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para las citas y la noche.',
        20, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), 'frasco', 50, 102.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), 'frasco', 100, 138.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), 'decant', 5, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), 'decant', 10, 17.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Citas', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cilantro'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Albahaca'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tabaco'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'the-one'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 61);

-- Badee Al Oud Amethyst, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('badee-al-oud-amethyst', 'Badee Al Oud Amethyst', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'mujer', 'arabe', 'Extrait',
        'Badee Al Oud Amethyst es un oriental ambarado, cálido y envolvente. Abre con rosa, pimienta rosa y bergamota, en el corazón oud, ámbar y jazmín le dan su personalidad, y el fondo de vainilla, almizcle y pachulí deja una estela cálida. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y los eventos.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), 'frasco', 100, 42.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta rosa'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'badee-al-oud-amethyst'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 52);

-- Raghba, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('raghba', 'Raghba', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'oriental'),
        'unisex', 'arabe', 'Eau de Parfum',
        'Raghba es un oriental ambarado, cálido y envolvente. Abre con incienso y agarwood, en el corazón azúcar y rosa le dan su personalidad, y el fondo de vainilla, almizcle y ámbar deja una estela cálida. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y las citas.',
        25, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), 'frasco', 100, 30.00, 2);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Agarwood'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azúcar'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'raghba'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 55);

-- Black Opium, Yves Saint Laurent
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('black-opium', 'Black Opium', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Yves Saint Laurent'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'mujer', 'disenador', 'Eau de Parfum',
        'Black Opium es un perfume gourmand, dulce y adictivo. Abre con pera, pimienta rosa y azahar, en el corazón café, jazmín y almendra amarga le dan su personalidad, y el fondo de vainilla, pachulí y cedro deja una estela dulce. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y los eventos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), 'frasco', 50, 112.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), 'frasco', 100, 152.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), 'decant', 2, 5.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), 'decant', 5, 11.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), 'decant', 10, 19.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pera'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta rosa'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Café'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almendra amarga'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'black-opium'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 58);

-- Angels' Share, Kilian
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('angels-share', 'Angels'' Share', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Kilian'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'unisex', 'nicho', 'Parfum',
        'Angels'' Share es un perfume gourmand, dulce y adictivo. Abre con coñac y canela, en el corazón haba tonka y roble le dan su personalidad, y el fondo de praliné, vainilla y sándalo deja una estela dulce. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), 'frasco', 50, 214.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), 'frasco', 100, 345.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), 'decant', 2, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), 'decant', 5, 22.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), 'decant', 10, 36.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Coñac'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Roble'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Praliné'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Sándalo'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'angels-share'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 61);

-- Khamrah Qahwa, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('khamrah-qahwa', 'Khamrah Qahwa', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'unisex', 'arabe', 'Eau de Parfum',
        'Khamrah Qahwa es un perfume gourmand, dulce y adictivo. Abre con canela, cardamomo y jengibre, en el corazón café, praliné y frutas confitadas le dan su personalidad, y el fondo de vainilla, haba tonka y benjuí deja una estela dulce. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y las citas.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), 'frasco', 100, 44.00, 12),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Café'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Praliné'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frutas confitadas'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Benjuí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'khamrah-qahwa'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 52);

-- La Vie Est Belle, Lancôme
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('la-vie-est-belle', 'La Vie Est Belle', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lancôme'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'mujer', 'disenador', 'Eau de Parfum',
        'La Vie Est Belle es un perfume gourmand, dulce y adictivo. Abre con grosella negra y pera, en el corazón iris, jazmín y azahar le dan su personalidad, y el fondo de praliné, vainilla y pachulí deja una estela dulce. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el día a día y las citas.',
        15, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), 'frasco', 50, 108.00, 8),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), 'frasco', 100, 146.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), 'decant', 2, 5.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), 'decant', 5, 11.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), 'decant', 10, 18.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Grosella negra'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pera'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Iris'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azahar'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Praliné'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'la-vie-est-belle'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 55);

-- Stronger With You Intensely, Emporio Armani
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('stronger-with-you', 'Stronger With You Intensely', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Emporio Armani'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'hombre', 'disenador', 'Parfum',
        'Stronger With You Intensely es un perfume gourmand, dulce y adictivo. Abre con pimienta rosa, enebro y mandarina, en el corazón canela, lavanda y salvia le dan su personalidad, y el fondo de vainilla, haba tonka y ámbar deja una estela dulce. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para las citas y la noche.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), 'frasco', 50, 98.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), 'frasco', 100, 132.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), 'decant', 5, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), 'decant', 10, 16.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Citas', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta rosa'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Enebro'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Salvia'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'stronger-with-you'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 58);

-- Bianco Latte, Giardini di Toscana
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('bianco-latte', 'Bianco Latte', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Giardini di Toscana'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'gourmand'),
        'unisex', 'nicho', 'Extrait',
        'Bianco Latte es un perfume gourmand, dulce y adictivo. Abre con caramelo y coco, en el corazón leche y miel le dan su personalidad, y el fondo de vainilla y almizcle blanco deja una estela dulce. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para el día a día y las citas.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), 'frasco', 50, 180.00, 11),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), 'frasco', 100, 290.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), 'decant', 2, 9.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), 'decant', 5, 18.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), 'decant', 10, 30.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Caramelo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Coco'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Leche'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Miel'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle blanco'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Dulce'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Vainilla'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cálido especiado'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'bianco-latte'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 61);

-- Tuscan Leather, Tom Ford
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('tuscan-leather', 'Tuscan Leather', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Tom Ford'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'unisex', 'nicho', 'Eau de Parfum',
        'Tuscan Leather es una fragancia de cuero y especias, intensa y con carácter. Abre con frambuesa, azafrán y tomillo, en el corazón olíbano y jazmín le dan su personalidad, y el fondo de cuero, ante y ámbar deja una estela profunda. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), 'frasco', 50, 248.00, 7),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), 'frasco', 100, 400.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), 'decant', 2, 12.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), 'decant', 5, 25.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), 'decant', 10, 42.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Frambuesa'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tomillo'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Olíbano'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cuero'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ante'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'tuscan-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 52);

-- Spicebomb Extreme, Viktor&Rolf
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('spicebomb-extreme', 'Spicebomb Extreme', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Viktor&Rolf'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'hombre', 'disenador', 'Parfum',
        'Spicebomb Extreme es una fragancia de cuero y especias, intensa y con carácter. Abre con pimienta negra y comino, en el corazón canela, azafrán y lavanda le dan su personalidad, y el fondo de tabaco, vainilla y ámbar deja una estela profunda. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y las citas.',
        20, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), 'frasco', 50, 101.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), 'frasco', 100, 136.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), 'decant', 5, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), 'decant', 10, 17.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta negra'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Comino'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tabaco'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'spicebomb-extreme'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 55);

-- Ombré Leather, Tom Ford
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('ombre-leather', 'Ombré Leather', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Tom Ford'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'unisex', 'nicho', 'Parfum',
        'Ombré Leather es una fragancia de cuero y especias, intensa y con carácter. Abre con cardamomo, en el corazón cuero y jazmín sambac le dan su personalidad, y el fondo de ámbar, musgo y pachulí deja una estela profunda. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), 'frasco', 50, 186.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), 'frasco', 100, 300.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), 'decant', 2, 9.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), 'decant', 5, 19.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), 'decant', 10, 31.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cuero'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín sambac'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Musgo'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'ombre-leather'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 58);

-- Fahrenheit, Dior
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('fahrenheit', 'Fahrenheit', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Dior'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Fahrenheit es una fragancia de cuero y especias, intensa y con carácter. Abre con nuez moscada, lavanda y mandarina, en el corazón violeta, cuero y madreselva le dan su personalidad, y el fondo de vetiver, pachulí y almizcle deja una estela profunda. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la oficina y la noche.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), 'frasco', 50, 96.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), 'frasco', 100, 130.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), 'decant', 5, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), 'decant', 10, 16.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nuez moscada'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Violeta'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cuero'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Madreselva'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'fahrenheit'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 61);

-- Oud for Greatness, Initio
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('oud-for-greatness', 'Oud for Greatness', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Initio'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'unisex', 'nicho', 'Extrait',
        'Oud for Greatness es una fragancia de cuero y especias, intensa y con carácter. Abre con azafrán, nuez moscada y lavanda, en el corazón oud le dan su personalidad, y el fondo de pachulí y almizcle deja una estela profunda. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para los eventos y la noche.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), 'frasco', 50, 242.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), 'frasco', 100, 390.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), 'decant', 2, 12.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), 'decant', 5, 24.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), 'decant', 10, 41.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Eventos', 'Noche');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nuez moscada'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'oud-for-greatness'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 52);

-- Qaed Al Fursan, Lattafa
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('qaed-al-fursan', 'Qaed Al Fursan', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Lattafa'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'hombre', 'arabe', 'Eau de Parfum',
        'Qaed Al Fursan es una fragancia de cuero y especias, intensa y con carácter. Abre con piña y azafrán, en el corazón jazmín y oud le dan su personalidad, y el fondo de musgo, ámbar y madera de cedro deja una estela profunda. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y los eventos.',
        30, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), 'frasco', 100, 30.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Musgo'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Madera de cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'qaed-al-fursan'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 55);

-- Shaghaf Oud, Swiss Arabian
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('shaghaf-oud', 'Shaghaf Oud', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Swiss Arabian'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'unisex', 'arabe', 'Extrait',
        'Shaghaf Oud es una fragancia de cuero y especias, intensa y con carácter. Abre con azafrán y nuez moscada, en el corazón rosa y praliné le dan su personalidad, y el fondo de oud, vainilla y notas amaderadas deja una estela profunda. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para la noche y los eventos.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), 'frasco', 100, 48.00, 5);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Azafrán'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Nuez moscada'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Rosa'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Praliné'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Oud'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas amaderadas'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'shaghaf-oud'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 58);

-- Invictus Victory Elixir, Paco Rabanne
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('invictus-victory-elixir', 'Invictus Victory Elixir', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Paco Rabanne'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'hombre', 'disenador', 'Parfum',
        'Invictus Victory Elixir es una fragancia de cuero y especias, intensa y con carácter. Abre con cardamomo y pimienta negra, en el corazón incienso y lavanda le dan su personalidad, y el fondo de haba tonka, vainilla y pachulí deja una estela profunda. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y los eventos.',
        0, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), 'frasco', 50, 99.00, 12),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), 'frasco', 100, 134.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), 'decant', 5, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), 'decant', 10, 17.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta negra'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Incienso'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus-victory-elixir'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 61);

-- Naxos, Xerjoff
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('naxos', 'Naxos', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Xerjoff'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'cuero'),
        'unisex', 'nicho', 'Extrait',
        'Naxos es una fragancia de cuero y especias, intensa y con carácter. Abre con bergamota, lavanda y limón, en el corazón miel, canela y jazmín le dan su personalidad, y el fondo de tabaco, haba tonka y vainilla deja una estela profunda. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la noche y las citas.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), 'frasco', 50, 223.00, 8),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), 'frasco', 100, 360.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), 'decant', 2, 11.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), 'decant', 5, 22.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), 'decant', 10, 38.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Miel'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Canela'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Tabaco'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cuero'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ahumado'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'naxos'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Ámbar'), 52);

-- Aventus, Creed
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('aventus', 'Aventus', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Creed'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'nicho', 'Eau de Parfum',
        'Aventus es una fragancia aromática, fresca, limpia y versátil. Abre con piña, bergamota y grosella negra, en el corazón abedul, pachulí y jazmín le dan su personalidad, y el fondo de almizcle, musgo de roble y ámbar gris deja una estela fresca. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para los eventos y la oficina.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), 'frasco', 50, 260.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), 'frasco', 100, 420.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), 'decant', 2, 13.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), 'decant', 5, 26.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), 'decant', 10, 44.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Eventos', 'Oficina');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Grosella negra'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Abedul'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Musgo de roble'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar gris'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'aventus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 55);

-- Y, Yves Saint Laurent
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('y-edp', 'Y', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Yves Saint Laurent'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Parfum',
        'Y es una fragancia aromática, fresca, limpia y versátil. Abre con manzana, jengibre y bergamota, en el corazón salvia, bayas de enebro y geranio le dan su personalidad, y el fondo de haba tonka, cedro y vetiver deja una estela fresca. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el día a día y las citas.',
        15, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), 'frasco', 50, 105.00, 11),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), 'frasco', 100, 142.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), 'decant', 2, 5.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), 'decant', 5, 10.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), 'decant', 10, 18.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jengibre'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Salvia'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bayas de enebro'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Geranio'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'y-edp'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- Invictus, Paco Rabanne
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('invictus', 'Invictus', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Paco Rabanne'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Invictus es una fragancia aromática fresca con un lado marino muy marcado. Abre con pomelo, notas marinas y mandarina, en el corazón el laurel y el jazmín le dan cuerpo, y el fondo de ámbar gris, guayaco y pachulí deja una estela limpia y con energía. Es de los perfumes masculinos más vendidos de los últimos años. Funciona muy bien para el día a día, el verano o una salida con amigos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), 'frasco', 50, 58.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), 'frasco', 100, 79.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), 'decant', 10, 10.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Verano', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas marinas'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Laurel'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar gris'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Guayaco'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Marino'), 84),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 72),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'invictus'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- Luna Rossa Carbon, Prada
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('luna-rossa-carbon', 'Luna Rossa Carbon', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Prada'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Luna Rossa Carbon es una fragancia aromática, fresca, limpia y versátil. Abre con bergamota y pimienta, en el corazón lavanda y notas metálicas le dan su personalidad, y el fondo de ambroxan y pachulí deja una estela fresca. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la oficina y el día a día.',
        20, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), 'frasco', 50, 87.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), 'frasco', 100, 118.00, 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), 'decant', 2, 4.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), 'decant', 5, 9.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), 'decant', 10, 15.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Diario');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas metálicas'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ambroxan'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'luna-rossa-carbon'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 52);

-- Eros, Versace
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('eros', 'Eros', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Versace'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Eros es una fragancia aromática, fresca, limpia y versátil. Abre con menta, manzana verde y limón, en el corazón haba tonka, geranio y ambroxan le dan su personalidad, y el fondo de vainilla, vetiver y cedro deja una estela fresca. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para la noche y los eventos.',
        0, FALSE, TRUE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), 'frasco', 50, 83.00, 10),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), 'frasco', 100, 112.00, 5),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), 'decant', 2, 4.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), 'decant', 5, 8.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), 'decant', 10, 14.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Noche', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Menta'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana verde'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Limón'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Geranio'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ambroxan'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'eros'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 55);

-- Hacivat, Nishane
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('hacivat', 'Hacivat', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Nishane'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'unisex', 'nicho', 'Extrait',
        'Hacivat es una fragancia aromática, fresca, limpia y versátil. Abre con piña, pomelo y bergamota, en el corazón cedro, pachulí y jazmín le dan su personalidad, y el fondo de musgo de roble y notas amaderadas deja una estela fresca. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para la oficina y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), 'frasco', 50, 192.00, 6),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), 'frasco', 100, 310.00, 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), 'decant', 2, 9.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), 'decant', 5, 19.50, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), 'decant', 10, 32.50, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Oficina', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Piña'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pomelo'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pachulí'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Musgo de roble'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Notas amaderadas'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 80),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 66),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'hacivat'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 58);

-- Odyssey Mandarin Sky, Armaf
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('odyssey-mandarin-sky', 'Odyssey Mandarin Sky', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Armaf'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'arabe', 'Eau de Parfum',
        'Odyssey Mandarin Sky es una fragancia aromática, fresca, limpia y versátil. Abre con mandarina y naranja amarga, en el corazón haba tonka y caramelo le dan su personalidad, y el fondo de ámbar y vetiver deja una estela fresca. Es una propuesta de la perfumería árabe con gran duración en la piel. Funciona muy bien para el día a día y las citas.',
        10, TRUE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), 'frasco', 100, 36.00, 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), 'decant', 2, 3.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), 'decant', 5, 6.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), 'decant', 10, 10.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Diario', 'Citas');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mandarina'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Naranja amarga'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Haba tonka'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Caramelo'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vetiver'), 'fondo', 2);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 77),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 64),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'odyssey-mandarin-sky'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 61);

-- Layton, Parfums de Marly
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('layton', 'Layton', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Parfums de Marly'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'nicho', 'Eau de Parfum',
        'Layton es una fragancia aromática, fresca, limpia y versátil. Abre con manzana, lavanda y bergamota, en el corazón geranio, violeta y jazmín le dan su personalidad, y el fondo de vainilla, cardamomo y pimienta deja una estela fresca. Viene de una casa de nicho, con una fórmula de autor poco común. Funciona muy bien para las citas y los eventos.',
        0, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), 'frasco', 50, 205.00, 9),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), 'frasco', 100, 330.00, 4),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), 'decant', 2, 10.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), 'decant', 5, 21.00, 40),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), 'decant', 10, 35.00, 40);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Citas', 'Eventos');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Lavanda'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Bergamota'), 'salida', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Geranio'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Violeta'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Jazmín'), 'corazon', 3),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Vainilla'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cardamomo'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Pimienta'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 86),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 70),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'layton'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 52);

-- Voyage, Nautica
INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES ('nautica-voyage', 'Voyage', (SELECT Mar_id FROM Marca WHERE Mar_nombre = 'Nautica'), (SELECT Fam_id FROM Familia WHERE Fam_codigo = 'aromatico'),
        'hombre', 'disenador', 'Eau de Toilette',
        'Voyage es una fragancia aromática, fresca, limpia y versátil. Abre con manzana verde y hoja verde, en el corazón loto y mimosa le dan su personalidad, y el fondo de almizcle, cedro y ámbar deja una estela fresca. Es una de las fragancias más reconocidas de su casa. Funciona muy bien para el verano y el día a día.',
        25, FALSE, FALSE);
INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), 'frasco', 100, 38.00, 5);
INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT (SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), Oca_id FROM Ocasion WHERE Oca_nombre IN ('Verano', 'Diario');
INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Manzana verde'), 'salida', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Hoja verde'), 'salida', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Loto'), 'corazon', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Mimosa'), 'corazon', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Almizcle'), 'fondo', 1),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Cedro'), 'fondo', 2),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Not_id FROM Nota WHERE Not_nombre = 'Ámbar'), 'fondo', 3);
INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Aromático'), 100),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Fresco especiado'), 83),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Cítrico'), 68),
  ((SELECT Pro_id FROM Producto WHERE Pro_slug = 'nautica-voyage'), (SELECT Aco_id FROM Acorde WHERE Aco_nombre = 'Amaderado'), 55);

COMMIT;


-- =========================================================
-- 5. PERMISOS DEL USUARIO DE LA APLICACIÓN
-- La aplicación se conecta con maisonkage_app, que solo puede leer
-- y modificar filas. No puede crear ni borrar tablas
-- Si ese usuario no existe en el servidor este bloque no hace nada
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'maisonkage_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO maisonkage_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO maisonkage_app;
  END IF;
END;
$$;

-- =========================================================
-- 6. CONSULTAS DE VERIFICACIÓN
-- Ninguna fila debe tener menos de 10 perfumes
-- =========================================================
-- SELECT * FROM (
--   SELECT 'Público ' || Pro_publico AS categoria, COUNT(*) AS perfumes FROM Producto GROUP BY Pro_publico
--   UNION ALL SELECT 'Origen ' || Pro_origen, COUNT(*) FROM Producto GROUP BY Pro_origen
--   UNION ALL SELECT 'Familia ' || F.Fam_nombre, COUNT(*) FROM Producto P JOIN Familia F ON F.Fam_id = P.Fam_id GROUP BY F.Fam_nombre
--   UNION ALL SELECT 'Ocasión ' || O.Oca_nombre, COUNT(*) FROM ProductoOcasion R JOIN Ocasion O ON O.Oca_id = R.Oca_id GROUP BY O.Oca_nombre
--   UNION ALL SELECT 'Concentración ' || Pro_concentracion, COUNT(*) FROM Producto GROUP BY Pro_concentracion
--   UNION ALL SELECT 'Ofertas', COUNT(*) FROM Producto WHERE Pro_oferta > 0
--   UNION ALL SELECT 'Novedades', COUNT(*) FROM Producto WHERE Pro_novedad
--   UNION ALL SELECT 'Más vendidos', COUNT(*) FROM Producto WHERE Pro_mas_vendido
--   UNION ALL SELECT 'Decants', COUNT(DISTINCT Pro_id) FROM Presentacion WHERE Pre_tipo = 'decant'
-- ) C ORDER BY perfumes;
