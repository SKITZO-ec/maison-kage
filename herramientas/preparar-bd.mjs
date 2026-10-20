/* =========================================================
   MAISON KAGE · Preparar la base de datos
   Crea la base si no existe y ejecuta database/maisonkage.sql
   Uso  node herramientas/preparar-bd.mjs [--prueba]
   También se puede importar y llamar a prepararBd(configBd)
   ========================================================= */
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarConfig } from '../backend/config.js';

const archivoSql = path.resolve(import.meta.dirname, '..', 'database', 'maisonkage.sql');

export async function prepararBd(configBd){
  const { database, ...conexion } = configBd;

  /* Se entra por la base postgres para poder crear la de destino */
  const admin = new pg.Client({ ...conexion, database: 'postgres' });
  await admin.connect();
  try{
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (!rowCount) await admin.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
  }finally{
    await admin.end();
  }

  /* El script completo va en una sola consulta, el protocolo simple acepta varias sentencias */
  const sql = await fs.readFile(archivoSql, 'utf8');
  const cliente = new pg.Client({ ...conexion, database });
  await cliente.connect();
  try{
    await cliente.query(sql);
  }finally{
    await cliente.end();
  }
}

/* Cuando se ejecuta desde la terminal */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const config = cargarConfig(process.argv);
  prepararBd(config.bd)
    .then(() => console.log(`Base ${config.bd.database} lista`))
    .catch(e => { console.error(e.message); process.exit(1); });
}
