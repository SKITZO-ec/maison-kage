/* =========================================================
   MAISON KAGE · Cuenta
   Registro, login, logout y perfil del cliente
   ========================================================= */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ErrorUsuario, normalizarCorreo, validarCorreo, validarTelefono, validarClave, validarTexto, validarTextoOpcional } from '../reglas.js';
import { crearSesion, cerrarSesion, cerrarOtrasSesiones, exigirSesion } from '../sesion.js';

const COSTO = 12;
const MSG_LOGIN = 'El correo o la contraseña no son correctos.';
const MSG_CLAVE_ACTUAL = 'La contraseña actual no es correcta.';
/* Hash de relleno para que un correo inexistente tarde lo mismo que uno real */
const HASH_RELLENO = bcrypt.hashSync('relleno-sin-cuenta', COSTO);

const cuerpoDe = req => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
const publico = u => ({ nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono ?? null });

export function rutasCuenta(pool){
  const router = Router();

  router.post('/registro', async (req, res, next) => {
    try{
      const b = cuerpoDe(req);
      const nombre = validarTexto(b.nombre, 'Nombre', 60);
      /* El formulario tiene un solo campo Nombre y apellido, quien escribe una sola palabra queda sin apellido */
      const apellido = validarTextoOpcional(b.apellido, 'Apellido', 60);
      const correo = validarCorreo(b.correo);
      const telefono = validarTelefono(b.telefono);
      const clave = validarClave(b.clave);
      const hash = await bcrypt.hash(clave, COSTO);
      let usuId;
      try{
        const { rows } = await pool.query(
          `INSERT INTO Usuario (Usu_correo, Usu_clave, Usu_nombre, Usu_apellido, Usu_telefono)
           VALUES ($1, $2, $3, $4, $5) RETURNING Usu_id`, [correo, hash, nombre, apellido, telefono]);
        usuId = rows[0].usu_id;
      }catch(e){
        if (e.code === '23505') throw new ErrorUsuario('Ya existe una cuenta con este correo. Inicia sesión.', 409);
        throw e;
      }
      await crearSesion(pool, res, usuId);
      res.status(201).json(publico({ nombre, apellido, correo, telefono }));
    }catch(e){ next(e); }
  });

  router.post('/login', async (req, res, next) => {
    try{
      const b = cuerpoDe(req);
      const correo = normalizarCorreo(b.correo);
      const clave = typeof b.clave === 'string' ? b.clave : '';
      if (!correo) throw new ErrorUsuario('Completa el campo Correo electrónico.');
      if (!clave) throw new ErrorUsuario('Completa el campo Contraseña.');
      const { rows } = await pool.query('SELECT Usu_id, Usu_clave, Usu_nombre, Usu_apellido, Usu_correo, Usu_telefono FROM Usuario WHERE Usu_correo = $1', [correo]);
      const u = rows[0];
      const valida = await bcrypt.compare(clave, u ? u.usu_clave : HASH_RELLENO);
      if (!u || !valida) throw new ErrorUsuario(MSG_LOGIN, 401);
      await crearSesion(pool, res, u.usu_id);
      res.json(publico({ nombre: u.usu_nombre, apellido: u.usu_apellido, correo: u.usu_correo, telefono: u.usu_telefono }));
    }catch(e){ next(e); }
  });

  router.post('/logout', async (req, res, next) => {
    try{
      await cerrarSesion(pool, req, res);
      res.status(204).end();
    }catch(e){ next(e); }
  });

  router.get('/yo', (req, res) => {
    res.json(req.usuario ? publico(req.usuario) : null);
  });

  router.patch('/yo', exigirSesion, async (req, res, next) => {
    try{
      const b = cuerpoDe(req);
      const actual = req.usuario;
      /* Un campo que no viene se queda como estaba */
      const nombre = b.nombre === undefined ? actual.nombre : validarTexto(b.nombre, 'Nombre', 60);
      const apellido = b.apellido === undefined ? actual.apellido : validarTextoOpcional(b.apellido, 'Apellido', 60);
      const telefono = b.telefono === undefined ? (actual.telefono ?? null) : validarTelefono(b.telefono);
      const correo = b.correo === undefined ? actual.correo : validarCorreo(b.correo);
      const cambiaCorreo = correo !== actual.correo;
      if (cambiaCorreo){
        const claveActual = typeof b.claveActual === 'string' ? b.claveActual : '';
        const { rows } = await pool.query('SELECT Usu_clave FROM Usuario WHERE Usu_id = $1', [actual.id]);
        if (!claveActual || !(await bcrypt.compare(claveActual, rows[0].usu_clave))) throw new ErrorUsuario(MSG_CLAVE_ACTUAL);
      }
      try{
        await pool.query(
          `UPDATE Usuario SET Usu_nombre = $1, Usu_apellido = $2, Usu_telefono = $3, Usu_correo = $4 WHERE Usu_id = $5`,
          [nombre, apellido, telefono, correo, actual.id]);
      }catch(e){
        if (e.code === '23505') throw new ErrorUsuario('Ya existe una cuenta con ese correo.', 409);
        throw e;
      }
      if (cambiaCorreo) await cerrarOtrasSesiones(pool, req, actual.id);
      res.json(publico({ nombre, apellido, correo, telefono }));
    }catch(e){ next(e); }
  });

  router.put('/yo/clave', exigirSesion, async (req, res, next) => {
    try{
      const b = cuerpoDe(req);
      const { rows } = await pool.query('SELECT Usu_clave FROM Usuario WHERE Usu_id = $1', [req.usuario.id]);
      const actual = typeof b.actual === 'string' ? b.actual : '';
      if (!actual || !(await bcrypt.compare(actual, rows[0].usu_clave))) throw new ErrorUsuario(MSG_CLAVE_ACTUAL);
      const nueva = validarClave(b.nueva);
      await pool.query('UPDATE Usuario SET Usu_clave = $1 WHERE Usu_id = $2', [await bcrypt.hash(nueva, COSTO), req.usuario.id]);
      await cerrarOtrasSesiones(pool, req, req.usuario.id);
      res.json({ ok: true });
    }catch(e){ next(e); }
  });

  return router;
}
