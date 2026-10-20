/* =========================================================
   MAISON KAGE · Servidor
   Sirve las páginas de la tienda y la API en /api
   Solo se publican las páginas, js/ y plantillas/, nunca
   el backend, la base de datos ni el archivo .env
   ========================================================= */
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { productos, leerProductos } from './rutas/productos.js';

const raiz = path.resolve(import.meta.dirname, '..');
const app = express();
app.disable('x-powered-by');

app.use('/api', productos);

/* Las páginas siguen cargando js/productos.js, ahora se arma desde la base */
app.get('/js/productos.js', async (req, res, next) => {
  try{
    const lista = await leerProductos();
    res.type('application/javascript').set('Cache-Control', 'no-store')
       .send(`/* Catálogo leído de PostgreSQL */\nconst PRODUCTS = ${JSON.stringify(lista)};\n`);
  }catch(e){ next(e); }
});

app.use('/js', express.static(path.join(raiz, 'js')));
app.use('/plantillas', express.static(path.join(raiz, 'plantillas')));
app.get(/^\/([a-z0-9-]+\.html)?$/, (req, res) => {
  res.sendFile(path.join(raiz, req.params[0] || 'index.html'));
});
app.use((req, res) => res.status(404).sendFile(path.join(raiz, '404.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'No pudimos conectarnos con la base de datos. Intenta de nuevo en un momento.' });
});

const puerto = Number(process.env.PORT || 3000);
app.listen(puerto, () => console.log(`Maison Kage en http://localhost:${puerto}`));
