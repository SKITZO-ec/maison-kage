/* =========================================================
   MAISON KAGE · Páginas y archivos públicos
   Solo se publican las páginas, js/, source/ y plantillas/.
   Nunca el backend, la base de datos, los tests ni el .env
   ========================================================= */
import express, { Router } from 'express';
import path from 'node:path';
import { leerProductos } from './productos.js';

const raiz = path.resolve(import.meta.dirname, '..', '..');

export function rutasSitio(pool){
  const router = Router();

  /* Las páginas siguen cargando js/productos.js, ahora se arma desde la base */
  router.get('/js/productos.js', async (req, res, next) => {
    try{
      const lista = await leerProductos(pool);
      res.type('application/javascript').set('Cache-Control', 'no-store')
         .send(`/* Catálogo leído de PostgreSQL */\nconst PRODUCTS = ${JSON.stringify(lista)};\n`);
    }catch(e){ next(e); }
  });

  router.use('/js', express.static(path.join(raiz, 'js')));
  router.use('/source', express.static(path.join(raiz, 'source')));
  router.use('/plantillas', express.static(path.join(raiz, 'plantillas')));
  router.get(/^\/([a-z0-9-]+\.html)?$/, (req, res) => {
    res.sendFile(path.join(raiz, req.params[0] || 'index.html'));
  });
  router.use((req, res) => res.status(404).sendFile(path.join(raiz, '404.html')));

  return router;
}
