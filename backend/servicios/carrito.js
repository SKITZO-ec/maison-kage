/* =========================================================
   MAISON KAGE · Servicio del carrito
   Traduce las líneas que manda el navegador a presentaciones
   reales de la base y baja las cantidades a lo que se puede
   comprar. Nunca lanza por datos raros del navegador
   ========================================================= */
import { DEC_MAX } from '../reglas.js';

const TIPOS = ['frasco', 'decant'];

/* Deja solo las entradas con forma de línea y descarta el resto sin avisar */
function leerEntradas(lineas){
  const entradas = [];
  for (const l of Array.isArray(lineas) ? lineas : []){
    if (!l || typeof l !== 'object') continue;
    const ml = Number(l.ml);
    const qty = Math.floor(Number(l.qty));
    if (typeof l.id !== 'string' || l.id.length === 0 || l.id.length > 100) continue;
    if (!TIPOS.includes(l.kind)) continue;
    if (!Number.isInteger(ml)) continue;
    if (!(qty > 0)) continue;
    entradas.push({ id: l.id, kind: l.kind, ml, qty });
  }
  return entradas;
}

/* cliente puede ser un pool o un cliente de una transacción (cualquier cosa con .query) */
export async function sanearLineas(cliente, lineas){
  const entradas = leerEntradas(lineas);
  if (!entradas.length) return [];

  const slugs = [...new Set(entradas.map(e => e.id))];
  const { rows } = await cliente.query(
    `SELECT R.Pre_id, P.Pro_slug, R.Pre_tipo, R.Pre_ml, R.Pre_stock
       FROM Presentacion R JOIN Producto P ON P.Pro_id = R.Pro_id
      WHERE P.Pro_activo AND P.Pro_slug = ANY($1::text[])`, [slugs]);
  const porClave = new Map(rows.map(r => [`${r.pro_slug}|${r.pre_tipo}|${r.pre_ml}`, r]));

  /* Se juntan las repetidas por presentación antes de bajar la cantidad */
  const juntas = new Map();
  for (const e of entradas){
    const r = porClave.get(`${e.id}|${e.kind}|${e.ml}`);
    if (!r) continue;
    const previa = juntas.get(r.pre_id);
    if (previa) previa.qty += e.qty;
    else juntas.set(r.pre_id, { id: e.id, kind: e.kind, ml: e.ml, qty: e.qty, preId: r.pre_id, tope: Math.min(r.pre_stock, e.kind === 'decant' ? DEC_MAX : Infinity) });
  }

  const sanas = [];
  for (const { tope, ...linea } of juntas.values()){
    linea.qty = Math.min(linea.qty, tope);
    if (linea.qty > 0) sanas.push(linea);
  }
  return sanas;
}

/* El carrito se crea la primera vez que el usuario lo usa */
export async function asegurarCarrito(cliente, usuId){
  const { rows } = await cliente.query(
    `INSERT INTO Carrito (Usu_id) VALUES ($1)
     ON CONFLICT (Usu_id) DO UPDATE SET Car_actualizado = now()
     RETURNING Car_id`, [usuId]);
  return rows[0].car_id;
}

export async function leerCarrito(cliente, usuId){
  const { rows } = await cliente.query(
    `SELECT P.Pro_slug, R.Pre_tipo, R.Pre_ml, I.Cit_cantidad
       FROM Carrito C
       JOIN CarritoItem I ON I.Car_id = C.Car_id
       JOIN Presentacion R ON R.Pre_id = I.Pre_id
       JOIN Producto P ON P.Pro_id = R.Pro_id
      WHERE C.Usu_id = $1 ORDER BY I.Cit_id`, [usuId]);
  return rows.map(r => ({ id: r.pro_slug, kind: r.pre_tipo, ml: r.pre_ml, qty: r.cit_cantidad }));
}

/* Reemplaza las líneas guardadas por las ya saneadas */
export async function guardarLineas(cliente, carId, sanas){
  await cliente.query('DELETE FROM CarritoItem WHERE Car_id = $1', [carId]);
  for (const l of sanas){
    await cliente.query('INSERT INTO CarritoItem (Car_id, Pre_id, Cit_cantidad) VALUES ($1, $2, $3)', [carId, l.preId, l.qty]);
  }
}
