/* =========================================================
   MAISON KAGE · Aplicación Express
   Arma el middleware y las rutas sin ponerse a escuchar,
   así las pruebas pueden levantarla en un puerto libre
   ========================================================= */
import express from 'express';
import { rutasProductos } from './rutas/productos.js';
import { rutasSitio } from './rutas/sitio.js';
import { rutasCuenta } from './rutas/cuenta.js';
import { rutasRecuperar } from './rutas/recuperar.js';
import { rutasDirecciones } from './rutas/direcciones.js';
import { rutasFavoritos } from './rutas/favoritos.js';
import { rutasPrueba } from './rutas/prueba.js';
import { crearCorreo } from './correo.js';
import { ErrorUsuario } from './reglas.js';
import { cabeceras, csrf, limitador } from './seguridad.js';
import { leerSesion } from './sesion.js';

const ERRORES_CONEXION = ['ECONNREFUSED', '3D000', '28P01', '57P03'];

export function crearApp({ pool, config, correo = crearCorreo(config) }){
  const app = express();
  app.disable('x-powered-by');
  app.locals.config = config;
  app.locals.correo = correo;

  app.use(cabeceras());
  app.use(csrf());
  app.use('/api', express.json({ limit: '100kb' }));
  app.use('/api', leerSesion(pool));

  /* Cada ruta con intentos limitados lleva su propio contador por IP */
  for (const ruta of ['/login', '/registro', '/recuperar']) app.post('/api' + ruta, limitador(config.limiteIntentos));

  app.use('/api', rutasProductos(pool));
  app.use('/api', rutasCuenta(pool));
  app.use('/api', rutasRecuperar(pool, config, correo));
  app.use('/api', rutasDirecciones(pool));
  app.use('/api', rutasFavoritos(pool));
  /* La bandeja de pruebas solo se expone en modo de pruebas */
  if (config.nodeEnv === 'test') app.use('/api', rutasPrueba(correo));
  /* Una ruta de la API que no existe no debe caer en la página 404 */
  app.use('/api', (req, res) => res.status(404).json({ error: 'No encontramos lo que buscas.' }));
  app.use(rutasSitio(pool));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (ERRORES_CONEXION.includes(err.code)){
      console.error(err.message);
      return res.status(503).json({ error: 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.' });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'No pudimos leer los datos enviados.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Los datos enviados son demasiado grandes.' });
    if (err instanceof ErrorUsuario) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P0001') return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Algo salió mal. Intenta de nuevo.' });
  });

  return app;
}
