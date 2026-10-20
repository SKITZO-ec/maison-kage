/* =========================================================
   MAISON KAGE · Favoritos
   La lista de perfumes guardados, como slugs, en el orden
   en que se guardaron
   ========================================================= */
import { Router } from 'express';
import { ErrorUsuario } from '../reglas.js';
import { exigirSesion } from '../sesion.js';

async function listar(pool, usuId){
  const { rows } = await pool.query(
    `SELECT P.Pro_slug FROM Favorito F JOIN Producto P ON P.Pro_id = F.Pro_id
      WHERE F.Usu_id = $1 ORDER BY F.Fav_fecha ASC, F.Fav_id ASC`, [usuId]);
  return rows.map(r => r.pro_slug);
}

/* Un perfume inactivo se trata igual que uno que no existe */
async function buscarPerfume(pool, slug){
  const { rows } = await pool.query('SELECT Pro_id FROM Producto WHERE Pro_slug = $1 AND Pro_activo', [slug]);
  if (!rows[0]) throw new ErrorUsuario('No encontramos ese perfume.', 404);
  return rows[0].pro_id;
}

export function rutasFavoritos(pool){
  const router = Router();
  router.use('/favoritos', exigirSesion);

  router.get('/favoritos', async (req, res, next) => {
    try{
      res.json(await listar(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  router.put('/favoritos/:slug', async (req, res, next) => {
    try{
      const proId = await buscarPerfume(pool, req.params.slug);
      await pool.query(
        'INSERT INTO Favorito (Usu_id, Pro_id) VALUES ($1, $2) ON CONFLICT (Usu_id, Pro_id) DO NOTHING', [req.usuario.id, proId]);
      res.json(await listar(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  router.delete('/favoritos/:slug', async (req, res, next) => {
    try{
      const proId = await buscarPerfume(pool, req.params.slug);
      await pool.query('DELETE FROM Favorito WHERE Usu_id = $1 AND Pro_id = $2', [req.usuario.id, proId]);
      res.json(await listar(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  return router;
}
