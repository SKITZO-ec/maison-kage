/* =========================================================
   MAISON KAGE · Recuperar contraseña
   Pide un enlace por correo y lo canjea por una clave nueva
   ========================================================= */
import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ErrorUsuario, normalizarCorreo, validarClave } from '../reglas.js';
import { transaccion } from '../bd.js';
import { correoRecuperar } from '../plantillas-correo.js';

const COSTO = 12;
const MSG_PEDIDO = 'Si el correo tiene una cuenta, te enviamos un enlace';
const MSG_VENCIDO = 'El enlace venció o ya se usó. Pide uno nuevo.';
const sha256 = texto => crypto.createHash('sha256').update(texto).digest('hex');
const cuerpoDe = req => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};

export function rutasRecuperar(pool, config, correo){
  const router = Router();

  router.post('/recuperar', async (req, res, next) => {
    try{
      const direccion = normalizarCorreo(cuerpoDe(req).correo);
      const { rows } = await pool.query('SELECT Usu_id FROM Usuario WHERE Usu_correo = $1', [direccion]);
      if (rows[0]){
        const codigo = crypto.randomBytes(32).toString('hex');
        /* Se limpian los códigos viejos de la cuenta y los que ya vencieron */
        await pool.query('DELETE FROM RecuperacionClave WHERE Rec_vence <= NOW() OR (Usu_id = $1 AND NOT Rec_usado)', [rows[0].usu_id]);
        await pool.query(
          `INSERT INTO RecuperacionClave (Usu_id, Rec_token_hash, Rec_vence) VALUES ($1, $2, NOW() + interval '30 minutes')`,
          [rows[0].usu_id, sha256(codigo)]);
        const enlace = `${config.urlBase}/recuperar.html?codigo=${codigo}`;
        /* No se espera el envío a propósito. Un SMTP real tarda cientos de milisegundos y solo
           ocurre con cuentas registradas, así que esperarlo delataría qué correos existen.
           enviar nunca lanza y registra sus propios errores */
        void correo.enviar({ para: direccion, ...correoRecuperar(enlace) });
      }
      /* La respuesta es la misma exista o no la cuenta */
      res.json({ mensaje: MSG_PEDIDO });
    }catch(e){ next(e); }
  });

  router.post('/recuperar/:codigo', async (req, res, next) => {
    try{
      /* Primero la clave, así una clave débil no gasta el código */
      const clave = validarClave(cuerpoDe(req).clave);
      const hash = await bcrypt.hash(clave, COSTO);
      await transaccion(pool, async cx => {
        const { rows } = await cx.query(
          `UPDATE RecuperacionClave SET Rec_usado = TRUE
            WHERE Rec_token_hash = $1 AND NOT Rec_usado AND Rec_vence > NOW() RETURNING Usu_id`,
          [sha256(req.params.codigo)]);
        if (!rows[0]) throw new ErrorUsuario(MSG_VENCIDO);
        const usuId = rows[0].usu_id;
        await cx.query('UPDATE Usuario SET Usu_clave = $1 WHERE Usu_id = $2', [hash, usuId]);
        /* La petición no trae sesión, así que se cierran todas las de la cuenta */
        await cx.query('DELETE FROM Sesion WHERE Usu_id = $1', [usuId]);
      });
      res.json({ ok: true });
    }catch(e){ next(e); }
  });

  return router;
}
