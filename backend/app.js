/* =========================================================
   MAISON KAGE · Aplicación Express
   Arma el middleware y las rutas sin ponerse a escuchar,
   así las pruebas pueden levantarla en un puerto libre
   ========================================================= */
import express from 'express';
import { rutasProductos } from './rutas/productos.js';
import { rutasSitio } from './rutas/sitio.js';
import { ErrorUsuario } from './reglas.js';

const ERRORES_CONEXION = ['ECONNREFUSED', '3D000', '28P01', '57P03'];

export function crearApp({ pool, config }){
  const app = express();
  app.disable('x-powered-by');
  app.locals.config = config;

  app.use('/api', rutasProductos(pool));
  /* Una ruta de la API que no existe no debe caer en la página 404 */
  app.use('/api', (req, res) => res.status(404).json({ error: 'No encontramos lo que buscas.' }));
  app.use(rutasSitio(pool));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (ERRORES_CONEXION.includes(err.code)){
      console.error(err.message);
      return res.status(503).json({ error: 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.' });
    }
    if (err instanceof ErrorUsuario) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P0001') return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Algo salió mal. Intenta de nuevo.' });
  });

  return app;
}
