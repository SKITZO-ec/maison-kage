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

/* Si la base falla en /js/sesion.js se responde 200 con la sesión vacía, igual que con productos.js.
   Un error HTTP dejaría el script roto y la consola llena de errores */
function sesionVacia(res, e){
  console.error('No se pudo leer la sesión', e.message);
  if (res.headersSent) return;
  res.type('application/javascript').set('Cache-Control', 'no-store')
     .send('/* Sesión leída del servidor */\nconst SESION = {\n  usuario: null,\n  favoritos: [],\n  direcciones: [],\n  carrito: []\n};\n');
}

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
  router.get('/js/sesion.js', leerSesion(pool), async (req, res) => {
    try{
      const u = req.get('Sec-Fetch-Site') === 'cross-site' ? null : req.usuario;
      const [favoritos, direcciones, carrito] = u
        ? await Promise.all([listarFavoritos(pool, u.id), listarDirecciones(pool, u.id), leerCarrito(pool, u.id)])
        : [[], [], []];
      const usuario = u ? { nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono ?? null } : null;
      res.type('application/javascript').set('Cache-Control', 'no-store')
         .send(`/* Sesión leída del servidor */\nconst SESION = {\n  usuario: ${enScript(usuario)},\n  favoritos: ${enScript(favoritos)},\n  direcciones: ${enScript(direcciones)},\n  carrito: ${enScript(carrito)}\n};\n`);
    }catch(e){ sesionVacia(res, e); }
  }, (err, req, res, next) => sesionVacia(res, err));

  router.use('/js', express.static(path.join(raiz, 'js')));
  router.use('/source', express.static(path.join(raiz, 'source')));
  router.use('/plantillas', express.static(path.join(raiz, 'plantillas')));
  router.get(/^\/([a-z0-9-]+\.html)?$/, (req, res) => {
    res.sendFile(path.join(raiz, req.params[0] || 'index.html'));
  });

  /* URLs limpias. La ficha de un perfume solo se entrega si el slug existe y está activo,
     así un perfume que no existe responde 404 de verdad y no una ficha vacía.
     Si la base falla se entrega la ficha igual, y la página muestra el aviso con Reintentar */
  const noEncontrada = res => res.status(404).sendFile(path.join(raiz, '404.html'));
  router.get('/perfumes/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (!/^[a-z0-9-]+$/.test(slug)) return noEncontrada(res);
    try{
      const { rowCount } = await pool.query('SELECT 1 FROM Producto WHERE Pro_slug = $1 AND Pro_activo', [slug]);
      if (!rowCount) return noEncontrada(res);
    }catch(e){
      console.error('No se pudo revisar el perfume', e.message);
    }
    res.sendFile(path.join(raiz, 'producto.html'));
  });
  router.get(['/ofertas', '/decants'], (req, res) => res.sendFile(path.join(raiz, 'catalogo.html')));

  router.use((req, res) => noEncontrada(res));

  return router;
}
