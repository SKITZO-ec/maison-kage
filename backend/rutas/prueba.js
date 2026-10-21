/* =========================================================
   MAISON KAGE · Ruta solo para pruebas
   Deja leer la bandeja de correos y cambiar el stock a las
   pruebas de Playwright, que corren en otro proceso.
   Solo se monta con nodeEnv test
   ========================================================= */
import { Router } from 'express';
import { ErrorUsuario } from '../reglas.js';

export function rutasPrueba(correo, pool){
  const router = Router();
  router.get('/_prueba/correos', (req, res) => {
    const para = String(req.query.para ?? '');
    res.json(correo.bandeja.filter(c => c.para === para));
  });

  /* Simula que otro cliente compró unidades de una presentación */
  router.post('/_prueba/stock', async (req, res, next) => {
    try{
      const { id, kind, ml, stock } = req.body ?? {};
      if (typeof id !== 'string' || !['frasco', 'decant'].includes(kind) || !Number.isInteger(ml) || !Number.isInteger(stock) || stock < 0)
        throw new ErrorUsuario('Datos de stock no válidos.', 400);
      const { rows } = await pool.query(
        `UPDATE Presentacion R SET Pre_stock = $4
           FROM Producto P
          WHERE P.Pro_id = R.Pro_id AND P.Pro_slug = $1 AND R.Pre_tipo = $2 AND R.Pre_ml = $3
         RETURNING R.Pre_stock`, [id, kind, ml, stock]);
      if (!rows.length) throw new ErrorUsuario('No existe esa presentación.', 404);
      res.json({ id, kind, ml, stock: rows[0].pre_stock });
    }catch(e){ next(e); }
  });
  return router;
}
