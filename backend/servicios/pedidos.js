/* =========================================================
   MAISON KAGE · Servicio de pedidos
   Crea el pedido en una sola transacción y lo lee con la
   misma forma que hoy guarda js/paginas/checkout.js
   ========================================================= */
import { randomInt } from 'node:crypto';
import { transaccion } from '../bd.js';
import { ErrorUsuario, SHIP, FREE_SHIP, CIUDADES, validarCorreo, validarTelefono, validarTexto } from '../reglas.js';
import { asegurarCarrito, leerCarrito } from './carrito.js';

const aDinero = centavos => Number((centavos / 100).toFixed(2));
const nombreTipo = (tipo, plural) => tipo === 'decant' ? (plural ? 'decants' : 'decant') : (plural ? 'frascos' : 'frasco');

/* Revisa el cuerpo y devuelve solo los campos que se usan, lo demás se ignora */
export function validarDatos(b){
  b = (b && typeof b === 'object' && !Array.isArray(b)) ? b : {};
  const nombre = validarTexto(b.nombre, 'Nombre', 120);
  const correo = validarCorreo(b.correo);
  const telefono = validarTelefono(b.telefono);
  if (!telefono) throw new ErrorUsuario('Completa el campo Celular.');
  if (b.entrega !== 'envio' && b.entrega !== 'retiro') throw new ErrorUsuario('Elige cómo quieres recibir tu pedido.');
  if (b.metodo !== 'tarjeta' && b.metodo !== 'deuna') throw new ErrorUsuario('Elige un método de pago.');

  const datos = { nombre, correo, telefono, entrega: b.entrega, metodo: b.metodo, ciudad: null, dir: null, ref: null, ultimos4: null, verificacion: false };
  if (datos.entrega === 'envio'){
    datos.dir = validarTexto(b.dir, 'Dirección', 160);
    const ciudad = typeof b.ciudad === 'string' ? b.ciudad.trim() : '';
    if (!CIUDADES.includes(ciudad)) throw new ErrorUsuario('Elige una ciudad de la lista.');
    datos.ciudad = ciudad;
    const ref = typeof b.ref === 'string' ? b.ref.trim() : '';
    if (ref.length > 160) throw new ErrorUsuario('El campo Referencia no puede tener más de 160 caracteres.');
    datos.ref = ref || null;
  }
  if (datos.metodo === 'tarjeta'){
    if (typeof b.ultimos4 !== 'string' || !/^[0-9]{4}$/.test(b.ultimos4))
      throw new ErrorUsuario('Escribe los últimos 4 dígitos de la tarjeta.');
    datos.ultimos4 = b.ultimos4;
  }else{
    datos.verificacion = b.verificacion === true;
  }
  return datos;
}

/* La misma regla de precio que precioFinal en js/comun.js, la oferta solo toca los frascos */
const centavosFinales = r => r.pre_tipo === 'frasco' && r.pro_oferta
  ? Math.round(Number(r.pre_precio) * (100 - r.pro_oferta))
  : Math.round(Number(r.pre_precio) * 100);

/* Trae las presentaciones del carrito con candado, así dos pedidos por la última unidad se turnan */
async function bloquearPresentaciones(c, lineas){
  const { rows: previas } = await c.query(
    `SELECT R.Pre_id, P.Pro_slug, R.Pre_tipo, R.Pre_ml
       FROM Presentacion R JOIN Producto P ON P.Pro_id = R.Pro_id
      WHERE P.Pro_slug = ANY($1::text[])`, [[...new Set(lineas.map(l => l.id))]]);
  const idPor = new Map(previas.map(r => [`${r.pro_slug}|${r.pre_tipo}|${r.pre_ml}`, r.pre_id]));
  const ids = [...new Set(lineas.map(l => idPor.get(`${l.id}|${l.kind}|${l.ml}`)).filter(Boolean))].sort((a, b) => a - b);
  const { rows } = await c.query(
    `SELECT R.Pre_id, P.Pro_nombre, P.Pro_oferta, P.Pro_activo, R.Pre_tipo, R.Pre_ml, R.Pre_precio, R.Pre_stock
       FROM Presentacion R JOIN Producto P ON P.Pro_id = R.Pro_id
      WHERE R.Pre_id = ANY($1::int[]) ORDER BY R.Pre_id FOR UPDATE OF R`, [ids]);
  const porId = new Map(rows.map(r => [r.pre_id, r]));
  return lineas.map(l => ({ linea: l, fila: porId.get(idPor.get(`${l.id}|${l.kind}|${l.ml}`)) }));
}

export async function crearPedido(pool, usuario, entrada){
  const datos = validarDatos(entrada);

  const numero = await transaccion(pool, async c => {
    /* Este candado deja en fila a los pedidos del mismo usuario, el segundo ve el carrito vacío */
    const carId = await asegurarCarrito(c, usuario.id);
    const lineas = await leerCarrito(c, usuario.id);
    if (!lineas.length) throw new ErrorUsuario('Tu carrito está vacío.');

    /* Se juntan las líneas repetidas de una misma presentación */
    const porPres = new Map();
    for (const { linea, fila } of await bloquearPresentaciones(c, lineas)){
      if (!fila || !fila.pro_activo) throw new ErrorUsuario(`${fila ? fila.pro_nombre : linea.id} ya no está disponible.`);
      const previa = porPres.get(fila.pre_id);
      if (previa) previa.qty += linea.qty; else porPres.set(fila.pre_id, { fila, qty: linea.qty });
    }

    let subCent = 0;
    for (const { fila, qty } of porPres.values()){
      const nombre = `${fila.pro_nombre} ${fila.pre_ml} ml`;
      if (fila.pre_stock <= 0) throw new ErrorUsuario(`Ya no quedan unidades de ${nombre}.`);
      if (fila.pre_stock < qty) throw new ErrorUsuario(`Solo quedan ${fila.pre_stock} ${nombreTipo(fila.pre_tipo, fila.pre_stock !== 1)} de ${nombre}.`);
      subCent += centavosFinales(fila) * qty;
    }
    const envioCent = (datos.entrega === 'retiro' || subCent >= FREE_SHIP * 100) ? 0 : Math.round(SHIP * 100);

    const { rows: [ped] } = await c.query(
      `INSERT INTO Pedido (Usu_id, Ped_entrega, Ped_nombre, Ped_correo, Ped_telefono, Ped_subtotal, Ped_envio, Ped_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING Ped_id, Ped_numero`,
      [usuario.id, datos.entrega, datos.nombre, datos.correo, datos.telefono,
       aDinero(subCent), aDinero(envioCent), aDinero(subCent + envioCent)]);

    /* El trigger descuenta el stock y es la última defensa si algo se escapó */
    for (const [preId, { fila, qty }] of porPres){
      await c.query('INSERT INTO PedidoItem (Ped_id, Pre_id, Pit_cantidad, Pit_precio) VALUES ($1, $2, $3, $4)',
        [ped.ped_id, preId, qty, aDinero(centavosFinales(fila))]);
    }

    await c.query('INSERT INTO Pago (Ped_id, Pag_metodo, Pag_ultimos4, Pag_verificacion) VALUES ($1, $2, $3, $4)',
      [ped.ped_id, datos.metodo, datos.ultimos4, datos.metodo === 'deuna' && datos.verificacion]);

    /* Guía simulada de 12 dígitos, en producción la entrega Servientrega */
    const guia = datos.entrega === 'envio' ? String(randomInt(1e11, 1e12)) : null;
    await c.query('INSERT INTO Envio (Ped_id, Env_guia, Env_calle, Env_ciudad, Env_referencia) VALUES ($1, $2, $3, $4, $5)',
      [ped.ped_id, guia, datos.dir, datos.ciudad, datos.ref]);

    /* Como en la Fase 1, el primer envío deja guardados el celular y la primera dirección */
    if (datos.entrega === 'envio'){
      await c.query('UPDATE Usuario SET Usu_telefono = $2 WHERE Usu_id = $1 AND Usu_telefono IS NULL', [usuario.id, datos.telefono]);
      await c.query(
        `INSERT INTO Direccion (Usu_id, Dir_alias, Dir_calle, Dir_ciudad, Dir_referencia, Dir_telefono, Dir_principal)
         SELECT $1, 'Principal', $2, $3, $4, $5, TRUE
          WHERE NOT EXISTS (SELECT 1 FROM Direccion WHERE Usu_id = $1)`,
        [usuario.id, datos.dir, datos.ciudad, datos.ref, datos.telefono]);
    }

    await c.query('DELETE FROM CarritoItem WHERE Car_id = $1', [carId]);
    return ped.ped_numero;
  });

  return leerPedido(pool, usuario.id, numero);
}

const SELECT_PEDIDO = `
  SELECT P.Ped_id, V.Ped_numero, V.Ped_estado, V.Pag_metodo, V.Env_guia,
         P.Ped_fecha AT TIME ZONE current_setting('TimeZone') AS fecha,
         P.Ped_entrega, P.Ped_nombre, P.Ped_correo, P.Ped_telefono,
         P.Ped_subtotal, P.Ped_envio, P.Ped_total,
         E.Env_calle, E.Env_ciudad, E.Env_referencia
    FROM Pedido P
    JOIN Vista_pedido V ON V.Ped_id = P.Ped_id
    LEFT JOIN Envio E ON E.Ped_id = P.Ped_id`;

/* cliente puede ser el pool o un cliente de transacción. numero null devuelve todos los del usuario */
export async function leerPedido(cliente, usuId, numero = null){
  const { rows } = await cliente.query(
    `${SELECT_PEDIDO} WHERE P.Usu_id = $1 AND ($2::text IS NULL OR P.Ped_numero = $2) ORDER BY P.Ped_fecha DESC, P.Ped_id DESC`,
    [usuId, numero]);
  if (!rows.length) return numero === null ? [] : null;

  const { rows: lineas } = await cliente.query(
    `SELECT I.Ped_id, P.Pro_nombre, R.Pre_tipo, R.Pre_ml, I.Pit_cantidad, I.Pit_precio
       FROM PedidoItem I
       JOIN Presentacion R ON R.Pre_id = I.Pre_id
       JOIN Producto P ON P.Pro_id = R.Pro_id
      WHERE I.Ped_id = ANY($1::int[]) ORDER BY I.Pit_id`, [rows.map(r => r.ped_id)]);

  const pedidos = rows.map(r => ({
    num: r.ped_numero,
    fecha: r.fecha.toISOString(),
    estado: r.ped_estado,
    metodo: r.pag_metodo === 'deuna' ? 'Deuna' : 'Tarjeta',
    items: lineas.filter(l => l.ped_id === r.ped_id).map(l => ({
      nombre: l.pro_nombre,
      desc: `${l.pre_tipo === 'decant' ? 'Decant' : 'Frasco'} ${l.pre_ml} ml`,
      qty: l.pit_cantidad,
      unit: Number(l.pit_precio)
    })),
    sub: Number(r.ped_subtotal),
    ship: Number(r.ped_envio),
    total: Number(r.ped_total),
    email: r.ped_correo,
    entrega: r.ped_entrega,
    guia: r.env_guia ?? null,
    envio: { nombre: r.ped_nombre, dir: r.env_calle ?? '', ciudad: r.env_ciudad ?? '', ref: r.env_referencia ?? '', tel: r.ped_telefono }
  }));
  return numero === null ? pedidos : pedidos[0];
}

