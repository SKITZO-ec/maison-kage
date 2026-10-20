/* =========================================================
   MAISON KAGE · Seguridad
   Cabeceras con helmet, CSRF de doble envío y limitador de intentos
   ========================================================= */
import crypto from 'node:crypto';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

/* Lee las cookies de la petición sin depender de otro paquete */
export function leerCookies(req){
  const cookies = {};
  for (const par of String(req.headers.cookie || '').split(';')){
    const i = par.indexOf('=');
    if (i < 0) continue;
    const nombre = par.slice(0, i).trim();
    if (!nombre || nombre in cookies) continue;
    try{ cookies[nombre] = decodeURIComponent(par.slice(i + 1).trim()); }
    catch{ cookies[nombre] = par.slice(i + 1).trim(); }
  }
  return cookies;
}

export function cabeceras(){
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        /* El sitio se sirve por http en local, no hay que subirlo a https */
        upgradeInsecureRequests: null
      }
    }
  });
}

const iguales = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* Express compara las rutas sin distinguir mayúsculas, así que /API/x también cuenta como API.
   Doble envío. La cookie mk_csrf la lee el JavaScript de la página y la manda en X-CSRF */
export function csrf(){
  return (req, res, next) => {
    let token = leerCookies(req).mk_csrf;
    if (!token){
      token = crypto.randomBytes(32).toString('hex');
      res.cookie('mk_csrf', token, { httpOnly: false, sameSite: 'lax', secure: req.secure, path: '/' });
    }
    const escribe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (escribe && /^\/api(\/|$)/i.test(req.path)){
      const enviado = req.get('X-CSRF');
      if (!enviado || !leerCookies(req).mk_csrf || !iguales(enviado, token)){
        return res.status(403).json({ error: 'Tu sesión de seguridad venció. Recarga la página e intenta de nuevo.' });
      }
    }
    next();
  };
}

/* Máximo de peticiones por IP cada 15 minutos */
export function limitador(maximo){
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: maximo,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Demasiados intentos, espera unos minutos' })
  });
}
