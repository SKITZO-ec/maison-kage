/* =========================================================
   MAISON KAGE · Conexión a PostgreSQL
   El pool se crea con los datos de config.js y las
   operaciones de varios pasos van dentro de una transacción
   ========================================================= */
import pg from 'pg';

export function crearPool(configBd){
  const pool = new pg.Pool(configBd);
  /* Un error en una conexión inactiva no debe tumbar el servidor */
  pool.on('error', e => console.error(e.message));
  return pool;
}

/* Ejecuta fn con un cliente dedicado. Si fn lanza un error se deshace todo */
export async function transaccion(pool, fn){
  const cliente = await pool.connect();
  try{
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  }catch(e){
    try{ await cliente.query('ROLLBACK'); }catch{ /* la conexión ya estaba rota */ }
    throw e;
  }finally{
    cliente.release();
  }
}
