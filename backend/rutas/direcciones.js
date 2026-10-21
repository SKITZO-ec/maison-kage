/* =========================================================
   MAISON KAGE · Direcciones
   Las direcciones de envío de cada cliente. Toda consulta
   va filtrada por el usuario de la sesión
   ========================================================= */
import { Router } from 'express';
import { transaccion } from '../bd.js';
import { ErrorUsuario, CIUDADES, validarTelefono, validarTexto } from '../reglas.js';
import { exigirSesion } from '../sesion.js';

const MSG_NO_ENCONTRADA = 'No encontramos esa dirección.';
const cuerpoDe = req => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};

const COLUMNAS = `Dir_id, Dir_alias, Dir_calle, Dir_ciudad, Dir_referencia, Dir_telefono, Dir_principal`;
/* La principal va primero y después las más antiguas */
const ORDEN = 'ORDER BY Dir_principal DESC, Dir_id ASC';

/* La misma forma que usa js/paginas/direcciones.js */
const aDireccion = f => ({
  id: f.dir_id,
  alias: f.dir_alias,
  dir: f.dir_calle,
  ciudad: f.dir_ciudad,
  ref: f.dir_referencia ?? '',
  tel: f.dir_telefono,
  principal: f.dir_principal
});

export async function listarDirecciones(db, usuId){
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM Direccion WHERE Usu_id = $1 ${ORDEN}`, [usuId]);
  return rows.map(aDireccion);
}

/* Un id que no es un entero positivo se trata como una dirección que no existe */
function leerId(valor){
  if (!/^\d{1,9}$/.test(valor)) throw new ErrorUsuario(MSG_NO_ENCONTRADA, 404);
  return Number(valor);
}

export function rutasDirecciones(pool){
  const router = Router();
  router.use('/direcciones', exigirSesion);

  router.get('/direcciones', async (req, res, next) => {
    try{
      res.json(await listarDirecciones(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  router.post('/direcciones', async (req, res, next) => {
    try{
      const b = cuerpoDe(req);
      const alias = validarTexto(b.alias, 'Nombre de la dirección', 40);
      const calle = validarTexto(b.dir, 'Dirección', 160);
      const ciudad = validarTexto(b.ciudad, 'Ciudad', 40);
      if (!CIUDADES.includes(ciudad)) throw new ErrorUsuario('Elige una ciudad de la lista.');
      const tel = validarTelefono(b.tel);
      if (!tel) throw new ErrorUsuario('Completa el campo Celular.');
      const ref = typeof b.ref === 'string' ? b.ref.trim() : '';
      if (ref.length > 160) throw new ErrorUsuario('El campo Referencia no puede tener más de 160 caracteres.');
      const creada = await transaccion(pool, async db => {
        /* Bloquea al usuario para que dos altas a la vez no dejen dos primeras o ninguna */
        await db.query('SELECT 1 FROM Usuario WHERE Usu_id = $1 FOR UPDATE', [req.usuario.id]);
        const { rows: previas } = await db.query('SELECT 1 FROM Direccion WHERE Usu_id = $1 LIMIT 1', [req.usuario.id]);
        const { rows } = await db.query(
          `INSERT INTO Direccion (Usu_id, Dir_alias, Dir_calle, Dir_ciudad, Dir_referencia, Dir_telefono, Dir_principal)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNAS}`,
          [req.usuario.id, alias, calle, ciudad, ref || null, tel, previas.length === 0]);
        return rows[0];
      });
      res.status(201).json(aDireccion(creada));
    }catch(e){ next(e); }
  });

  router.patch('/direcciones/:id', async (req, res, next) => {
    try{
      const id = leerId(req.params.id);
      if (cuerpoDe(req).principal !== true) throw new ErrorUsuario('Solo se puede marcar una dirección como principal.');
      const lista = await transaccion(pool, async db => {
        /* El trigger deja apagadas las demás principales */
        const { rowCount } = await db.query(
          'UPDATE Direccion SET Dir_principal = TRUE WHERE Dir_id = $1 AND Usu_id = $2', [id, req.usuario.id]);
        if (!rowCount) throw new ErrorUsuario(MSG_NO_ENCONTRADA, 404);
        return listarDirecciones(db, req.usuario.id);
      });
      res.json(lista);
    }catch(e){ next(e); }
  });

  router.delete('/direcciones/:id', async (req, res, next) => {
    try{
      const id = leerId(req.params.id);
      const lista = await transaccion(pool, async db => {
        await db.query('SELECT 1 FROM Usuario WHERE Usu_id = $1 FOR UPDATE', [req.usuario.id]);
        const { rows } = await db.query(
          'DELETE FROM Direccion WHERE Dir_id = $1 AND Usu_id = $2 RETURNING Dir_principal', [id, req.usuario.id]);
        if (!rows[0]) throw new ErrorUsuario(MSG_NO_ENCONTRADA, 404);
        if (rows[0].dir_principal){
          await db.query(
            `UPDATE Direccion SET Dir_principal = TRUE
              WHERE Dir_id = (SELECT Dir_id FROM Direccion WHERE Usu_id = $1 ORDER BY Dir_id ASC LIMIT 1)`,
            [req.usuario.id]);
        }
        return listarDirecciones(db, req.usuario.id);
      });
      res.json(lista);
    }catch(e){ next(e); }
  });

  return router;
}
