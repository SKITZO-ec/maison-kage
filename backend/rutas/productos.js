/* =========================================================
   MAISON KAGE · Catálogo desde la base de datos
   Arma cada perfume con la misma forma que usa la tienda,
   con sus ocasiones, notas, acordes y presentaciones
   ========================================================= */
import { Router } from 'express';
import { pool } from '../bd.js';

const CONSULTA = `
SELECT json_build_object(
  'id', P.Pro_slug,
  'nombre', P.Pro_nombre,
  'marca', M.Mar_nombre,
  'origen', P.Pro_origen,
  'publico', P.Pro_publico,
  'familia', F.Fam_codigo,
  'conc', P.Pro_concentracion,
  'ocasion', (SELECT COALESCE(json_agg(O.Oca_nombre ORDER BY O.Oca_id), '[]')
                FROM ProductoOcasion R JOIN Ocasion O ON O.Oca_id = R.Oca_id
               WHERE R.Pro_id = P.Pro_id),
  'oferta', P.Pro_oferta,
  'novedad', P.Pro_novedad,
  'top', P.Pro_mas_vendido,
  'notas', (SELECT json_agg(nivel ORDER BY orden) FROM (
              SELECT CASE N.Prn_nivel WHEN 'salida' THEN 1 WHEN 'corazon' THEN 2 ELSE 3 END AS orden,
                     json_agg(T.Not_nombre ORDER BY N.Prn_orden) AS nivel
                FROM ProductoNota N JOIN Nota T ON T.Not_id = N.Not_id
               WHERE N.Pro_id = P.Pro_id
               GROUP BY N.Prn_nivel) X),
  'acordes', (SELECT json_agg(json_build_array(A.Aco_nombre, R.Pra_valor) ORDER BY R.Pra_valor DESC, R.Pra_id)
                FROM ProductoAcorde R JOIN Acorde A ON A.Aco_id = R.Aco_id
               WHERE R.Pro_id = P.Pro_id),
  'desc', P.Pro_descripcion,
  'pres', (SELECT json_agg(json_build_object('tipo', E.Pre_tipo, 'ml', E.Pre_ml, 'precio', E.Pre_precio::FLOAT, 'stock', E.Pre_stock)
                           ORDER BY E.Pre_tipo DESC, E.Pre_ml)
             FROM Presentacion E WHERE E.Pro_id = P.Pro_id)
) AS producto
  FROM Producto P
  JOIN Marca M ON M.Mar_id = P.Mar_id
  JOIN Familia F ON F.Fam_id = P.Fam_id
 WHERE P.Pro_activo
 ORDER BY P.Pro_id`;

export async function leerProductos(){
  const { rows } = await pool.query(CONSULTA);
  return rows.map(r => r.producto);
}

export const productos = Router();

productos.get('/productos', async (req, res, next) => {
  try{ res.json(await leerProductos()); }catch(e){ next(e); }
});
