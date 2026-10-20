/* =========================================================
   MAISON KAGE · Genera database/maisonkage.sql
   El esquema está escrito a mano abajo y los datos de los
   70 perfumes se toman de js/productos.js para no copiar
   nada a mano. Uso   node herramientas/generar-sql.mjs
   ========================================================= */
import fs from 'node:fs';
import vm from 'node:vm';

const raiz = new URL('..', import.meta.url).pathname;
const leer = f => fs.readFileSync(raiz + f, 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(leer('js/datos.js').replace(/^const /gm, 'var ') + '\n' + leer('js/productos.js').replace('const PRODUCTS', 'var PRODUCTS'), ctx);
const { PRODUCTS, FAMILIAS, OCASIONES } = ctx;

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const unicos = arr => [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'es'));

/* ---------- Esquema ---------- */
const tablas = `
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
`;

/* Convierte cada comentario de columna en un COMMENT ON para que se vea en pgAdmin */
function comentarios(sql){
  const out = [];
  let tabla = null;
  for(const linea of sql.split('\n')){
    const t = linea.match(/^CREATE TABLE (\w+)/);
    if(t){ tabla = t[1]; continue; }
    if(/^\);/.test(linea)){ tabla = null; continue; }
    const c = tabla && linea.match(/^\s+(\w+)\s+.*--\s*(.+)$/);
    if(c) out.push(`COMMENT ON COLUMN ${tabla}.${c[1]} IS ${q(c[2].trim())};`);
  }
  const tablasDoc = [...sql.matchAll(/-- ([^\n]+)\nCREATE TABLE (\w+)/g)].map(m => `COMMENT ON TABLE ${m[2]} IS ${q(m[1])};`);
  return tablasDoc.concat(out).join('\n');
}

const limpieza = `
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
`;

const triggers = `
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
`;

/* ---------- Datos ---------- */
const NIVELES = ['salida', 'corazon', 'fondo'];
const lineas = [];
const L = s => lineas.push(s);
const pro = slug => `(SELECT Pro_id FROM Producto WHERE Pro_slug = ${q(slug)})`;

L(`
-- =========================================================
-- 4. DATOS DEL CATÁLOGO
-- ${PRODUCTS.length} perfumes ficticios con sus presentaciones
-- =========================================================
`);
L('-- Marcas');
L('INSERT INTO Marca (Mar_nombre) VALUES\n' + unicos(PRODUCTS.map(p => p.marca)).map(m => `  (${q(m)})`).join(',\n') + ';\n');
L('-- Familias olfativas');
L('INSERT INTO Familia (Fam_codigo, Fam_nombre) VALUES\n' + Object.entries(FAMILIAS).map(([c, n]) => `  (${q(c)}, ${q(n)})`).join(',\n') + ';\n');
L('-- Ocasiones');
L('INSERT INTO Ocasion (Oca_nombre) VALUES\n' + OCASIONES.map(o => `  (${q(o)})`).join(',\n') + ';\n');
L('-- Notas olfativas');
L('INSERT INTO Nota (Not_nombre) VALUES\n' + unicos(PRODUCTS.flatMap(p => p.notas.flat())).map(n => `  (${q(n)})`).join(',\n') + ';\n');
L('-- Acordes');
L('INSERT INTO Acorde (Aco_nombre) VALUES\n' + unicos(PRODUCTS.flatMap(p => p.acordes.map(a => a[0]))).map(a => `  (${q(a)})`).join(',\n') + ';\n');

for(const p of PRODUCTS){
  L(`-- ${p.nombre}, ${p.marca}`);
  L(`INSERT INTO Producto (Pro_slug, Pro_nombre, Mar_id, Fam_id, Pro_publico, Pro_origen, Pro_concentracion, Pro_descripcion, Pro_oferta, Pro_novedad, Pro_mas_vendido)
VALUES (${q(p.id)}, ${q(p.nombre)}, (SELECT Mar_id FROM Marca WHERE Mar_nombre = ${q(p.marca)}), (SELECT Fam_id FROM Familia WHERE Fam_codigo = ${q(p.familia)}),
        ${q(p.publico)}, ${q(p.origen)}, ${q(p.conc)},
        ${q(p.desc)},
        ${p.oferta || 0}, ${p.novedad ? 'TRUE' : 'FALSE'}, ${p.top ? 'TRUE' : 'FALSE'});`);
  L(`INSERT INTO Presentacion (Pro_id, Pre_tipo, Pre_ml, Pre_precio, Pre_stock) VALUES\n` +
    p.pres.map(x => `  (${pro(p.id)}, ${q(x.tipo)}, ${x.ml}, ${x.precio.toFixed(2)}, ${x.stock})`).join(',\n') + ';');
  L(`INSERT INTO ProductoOcasion (Pro_id, Oca_id) SELECT ${pro(p.id)}, Oca_id FROM Ocasion WHERE Oca_nombre IN (${p.ocasion.map(q).join(', ')});`);
  L(`INSERT INTO ProductoNota (Pro_id, Not_id, Prn_nivel, Prn_orden) VALUES\n` +
    p.notas.flatMap((grupo, i) => grupo.map((n, j) => `  (${pro(p.id)}, (SELECT Not_id FROM Nota WHERE Not_nombre = ${q(n)}), ${q(NIVELES[i])}, ${j + 1})`)).join(',\n') + ';');
  L(`INSERT INTO ProductoAcorde (Pro_id, Aco_id, Pra_valor) VALUES\n` +
    p.acordes.map(([a, v]) => `  (${pro(p.id)}, (SELECT Aco_id FROM Acorde WHERE Aco_nombre = ${q(a)}), ${v})`).join(',\n') + ';\n');
}

const permisos = `
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
`;

const cabecera = `-- =========================================================
-- MAISON KAGE · Base de datos de la tienda
-- PostgreSQL 14 o superior
-- Autor Rodrigo Cordero
-- Archivo generado por herramientas/generar-sql.mjs a partir de js/productos.js
-- Se ejecuta completo de una vez y se puede repetir sin errores
-- =========================================================
SET client_encoding = 'UTF8';
`;

/* Con --sin-datos se genera solo la estructura en la ruta indicada */
const sinDatos = process.argv.indexOf('--sin-datos');
const destino = sinDatos >= 0 ? process.argv[sinDatos + 1] : raiz + 'database/maisonkage.sql';
const sql = [cabecera, limpieza, tablas, '-- Comentarios de tablas y columnas\n' + comentarios(tablas) + '\n', triggers,
  sinDatos >= 0 ? '' : 'BEGIN;\n' + lineas.join('\n') + '\nCOMMIT;\n', permisos].join('\n');
if(sinDatos < 0) fs.mkdirSync(raiz + 'database', { recursive: true });
fs.writeFileSync(destino, sql);
console.log(destino, sinDatos >= 0 ? 'generado sin datos' : `generado con ${PRODUCTS.length} perfumes`);
