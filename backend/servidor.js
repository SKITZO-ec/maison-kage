/* =========================================================
   MAISON KAGE · Servidor
   Lee la configuración y se pone a escuchar
   ========================================================= */
import { cargarConfig } from './config.js';
import { crearPool } from './bd.js';
import { crearApp } from './app.js';

const config = cargarConfig(process.argv);
const pool = crearPool(config.bd);
crearApp({ pool, config }).listen(config.puerto, () => {
  console.log(`Maison Kage en http://localhost:${config.puerto}`);
});
