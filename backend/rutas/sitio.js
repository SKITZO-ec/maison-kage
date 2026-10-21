/* =========================================================
   MAISON KAGE · Páginas y archivos públicos
   Solo se publican las páginas, js/, source/ y plantillas/.
   Nunca el backend, la base de datos, los tests ni el .env
   ========================================================= */
import express, { Router } from 'express';
import path from 'node:path';
import { leerProductos } from './productos.js';
import { listarFavoritos } from './favoritos.js';
import { listarDirecciones } from './direcciones.js';
import { leerCarrito } from '../servicios/carrito.js';
import { leerSesion } from '../sesion.js';

const raiz = path.resolve(import.meta.dirname, '..', '..');

/* JSON listo para ir dentro de un script. JSON.stringify ya escapa las comillas
   y como va en un archivo aparte un </script> no corta nada, pero los separadores
   U+2028 y U+2029 se escapan igual para que ningún navegador viejo los lea como salto de línea */
const enScript = valor => JSON.stringify(valor).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function rutasSitio(pool){
  const router = Router();

  /* Las páginas cargan js/productos.js y el archivo no existe en el disco, se arma desde la base.
     Si la base falla se responde 200 con const PRODUCTS = null; y comun.js muestra el aviso con
     el botón Reintentar. Un error HTTP aquí dejaría el script sin declarar y la página rota */
  router.get('/js/productos.js', async (req, res) => {
    res.type('application/javascript').set('Cache-Control', 'no-store');
    try{
      const lista = await leerProductos(pool);
      res.send(`/* Catálogo leído de PostgreSQL */\nconst PRODUCTS = ${JSON.stringify(lista)};\n`);
    }catch(e){
      console.error('No se pudo leer el catálogo', e.message);
      res.send('const PRODUCTS = null;');
    }
  });

  /* La sesión que leen todas las páginas, con la cuenta, sus favoritos, sus direcciones y su carrito.
     Nunca se guarda en caché porque cambia al entrar o salir. Si la pide otro sitio
     se le da la versión sin sesión, así no puede leer los datos con una etiqueta script */
  router.get('/js/sesion.js', leerSesion(pool), async (req, res, next) => {
    try{
      const u = req.get('Sec-Fetch-Site') === 'cross-site' ? null : req.usuario;
      const [favoritos, direcciones, carrito] = u
        ? await Promise.all([listarFavoritos(pool, u.id), listarDirecciones(pool, u.id), leerCarrito(pool, u.id)])
        : [[], [], []];
      const usuario = u ? { nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono ?? null } : null;
      res.type('application/javascript').set('Cache-Control', 'no-store')
         .send(`/* Sesión leída del servidor */\nconst SESION = {\n  usuario: ${enScript(usuario)},\n  favoritos: ${enScript(favoritos)},\n  direcciones: ${enScript(direcciones)},\n  carrito: ${enScript(carrito)}\n};\n`);
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
