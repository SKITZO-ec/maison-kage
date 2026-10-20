/* =========================================================
   MAISON KAGE · Configuración
   Lee el archivo .env y aplica el modo de pruebas
   cuando se pasa el argumento --prueba
   ========================================================= */
import 'dotenv/config';

export function cargarConfig(argv = process.argv){
  const env = process.env;
  const prueba = argv.includes('--prueba');
  const puerto = prueba ? 4174 : Number(env.PORT || 3000);
  return {
    puerto,
    nodeEnv: prueba ? 'test' : (env.NODE_ENV || 'development'),
    bd: {
      host: env.DB_HOST || 'localhost',
      port: Number(env.DB_PORT || 5432),
      database: prueba ? 'maisonkage_test' : (env.DB_NAME || 'maisonkage'),
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD || ''
    },
    limiteIntentos: prueba ? 1000 : Number(env.LIMITE_INTENTOS || 5),
    gmail: { usuario: env.GMAIL_USUARIO || '', claveApp: env.GMAIL_CLAVE_APP || '' },
    urlBase: env.URL_BASE || `http://localhost:${puerto}`
  };
}
