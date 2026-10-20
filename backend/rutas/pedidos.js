/* =========================================================
   MAISON KAGE · Pedidos
   Crear el pedido del carrito guardado y consultar los del
   usuario. Toda consulta va filtrada por la sesión
   ========================================================= */
import { Router } from 'express';
import { ErrorUsuario } from '../reglas.js';
import { exigirSesion } from '../sesion.js';
import { correoPedido } from '../plantillas-correo.js';
import { crearPedido, leerPedido } from '../servicios/pedidos.js';

const MSG_NO_ENCONTRADO = 'No encontramos ese pedido.';

export function rutasPedidos(pool){
  const router = Router();
  router.use('/pedidos', exigirSesion);

  router.post('/pedidos', async (req, res, next) => {
    try{
      const pedido = await crearPedido(pool, req.usuario, req.body);
      /* El correo sale después del COMMIT y no se espera, un fallo no cambia la respuesta */
      try{
        Promise.resolve(req.app.locals.correo.enviar({ para: pedido.email, ...correoPedido(pedido) })).catch(() => {});
      }catch(e){ console.error('No se pudo armar el correo del pedido', e.message); }
      res.status(201).json(pedido);
    }catch(e){ next(e); }
  });

  router.get('/pedidos', async (req, res, next) => {
    try{
      res.json(await leerPedido(pool, req.usuario.id));
    }catch(e){ next(e); }
  });

  router.get('/pedidos/:numero', async (req, res, next) => {
    try{
      if (!/^MK-\d{6,}$/.test(req.params.numero)) throw new ErrorUsuario(MSG_NO_ENCONTRADO, 404);
      const pedido = await leerPedido(pool, req.usuario.id, req.params.numero);
      if (!pedido) throw new ErrorUsuario(MSG_NO_ENCONTRADO, 404);
      res.json(pedido);
    }catch(e){ next(e); }
  });

  return router;
}
