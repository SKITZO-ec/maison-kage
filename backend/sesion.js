/* =========================================================
   MAISON KAGE · Sesiones
   La cookie guarda un código aleatorio y la base solo su SHA-256
   ========================================================= */
import crypto from 'node:crypto';
import { leerCookies } from './seguridad.js';

const DIAS = 7;
const sha256 = texto => crypto.createHash('sha256').update(texto).digest('hex');

function opcionesCookie(req){
  return { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' };
}

export async function crearSesion(pool, res, usuId){
  const codigo = crypto.randomBytes(32).toString('hex');
  /* Aprovecha para limpiar las sesiones que ya vencieron */
  await pool.query('DELETE FROM Sesion WHERE Ses_vence <= NOW()');
  await pool.query(
    `INSERT INTO Sesion (Usu_id, Ses_token_hash, Ses_vence) VALUES ($1, $2, NOW() + make_interval(days => $3))`,
    [usuId, sha256(codigo), DIAS]);
  res.cookie('mk_sesion', codigo, { ...opcionesCookie(res.req), maxAge: DIAS * 24 * 60 * 60 * 1000 });
}

/* Pone req.usuario con los datos de la cuenta o null si no hay sesión válida */
export function leerSesion(pool){
  return async (req, res, next) => {
    req.usuario = null;
    const codigo = leerCookies(req).mk_sesion;
    if (!codigo) return next();
    try{
      const { rows } = await pool.query(
        `SELECT U.Usu_id, U.Usu_correo, U.Usu_nombre, U.Usu_apellido, U.Usu_telefono
           FROM Sesion S JOIN Usuario U ON U.Usu_id = S.Usu_id
          WHERE S.Ses_token_hash = $1 AND S.Ses_vence > NOW()`, [sha256(codigo)]);
      if (rows[0]){
        const u = rows[0];
        req.usuario = { id: u.usu_id, correo: u.usu_correo, nombre: u.usu_nombre, apellido: u.usu_apellido, telefono: u.usu_telefono };
      }
      next();
    }catch(e){ next(e); }
  };
}

export async function cerrarSesion(pool, req, res){
  const codigo = leerCookies(req).mk_sesion;
  if (codigo) await pool.query('DELETE FROM Sesion WHERE Ses_token_hash = $1', [sha256(codigo)]);
  res.clearCookie('mk_sesion', opcionesCookie(req));
}

/* Cierra las sesiones de una cuenta menos la que viene en la petición */
export async function cerrarOtrasSesiones(pool, req, usuId){
  const codigo = leerCookies(req).mk_sesion;
  await pool.query('DELETE FROM Sesion WHERE Usu_id = $1 AND Ses_token_hash <> $2', [usuId, sha256(codigo || '')]);
}

export function exigirSesion(req, res, next){
  if (!req.usuario) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}
