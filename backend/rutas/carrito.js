/* =========================================================
   MAISON KAGE · Carrito con sesión
   Lo que el sitio guarda en sessionStorage sin cuenta, aquí
   vive en la base y siempre se devuelve ya saneado
   ========================================================= */
import { Router } from 'express';
import { transaccion } from '../bd.js';
import { ErrorUsuario } from '../reglas.js';
import { exigirSesion } from '../sesion.js';
import { asegurarCarrito, guardarLineas, leerCarrito, sanearLineas } from '../servicios/carrito.js';

const sinPresId = ({ id, kind, ml, qty }) => ({ id, kind, ml, qty });

function leerLineas(body){
  if (!body || !Array.isArray(body.lineas)) throw new ErrorUsuario('No pudimos leer tu carrito.', 400);
  return body.lineas;
}

export function rutasCarrito(pool){
  const router = Router();
  router.use('/carrito', exigirSesion);

  router.get('/carrito', async (req, res, next) => {
    try{
      res.json(await leerCarrito(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  router.put('/carrito', async (req, res, next) => {
    try{
      const lineas = leerLineas(req.body);
      const sanas = await transaccion(pool, async c => {
        const carId = await asegurarCarrito(c, req.usuario.id);
        const sanas = await sanearLineas(c, lineas);
        await guardarLineas(c, carId, sanas);
        return sanas;
      });
      res.json(sanas.map(sinPresId));
    }catch(e){ next(e); }
  });

  router.post('/carrito/fusionar', async (req, res, next) => {
    try{
      const entrantes = leerLineas(req.body);
      const sanas = await transaccion(pool, async c => {
        /* asegurarCarrito toma el candado de la fila, así dos fusiones seguidas no se pisan */
        const carId = await asegurarCarrito(c, req.usuario.id);
        const guardadas = await leerCarrito(c, req.usuario.id);
        const sanas = await sanearLineas(c, [...guardadas, ...entrantes]);
        await guardarLineas(c, carId, sanas);
        return sanas;
      });
      res.json(sanas.map(sinPresId));
    }catch(e){ next(e); }
  });

  return router;
}
