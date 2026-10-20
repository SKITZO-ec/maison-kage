/* =========================================================
   MAISON KAGE · Conexión a PostgreSQL
   Los datos de conexión se leen del archivo .env
   ========================================================= */
import pg from 'pg';

export const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'maisonkage',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});
