/* =========================================================
   MAISON KAGE · Ruta solo para pruebas
   Deja leer la bandeja de correos a las pruebas de Playwright,
   que corren en otro proceso. Solo se monta con nodeEnv test
   ========================================================= */
import { Router } from 'express';

export function rutasPrueba(correo){
  const router = Router();
  router.get('/_prueba/correos', (req, res) => {
    const para = String(req.query.para ?? '');
    res.json(correo.bandeja.filter(c => c.para === para));
  });
  return router;
}
