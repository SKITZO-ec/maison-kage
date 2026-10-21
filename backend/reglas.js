/* =========================================================
   MAISON KAGE · Reglas compartidas
   Las constantes y validaciones se agregan aquí
   ========================================================= */

/* Error con un mensaje que la página puede mostrar tal cual */
export class ErrorUsuario extends Error {
  constructor(mensaje, status = 400){
    super(mensaje);
    this.name = 'ErrorUsuario';
    this.status = status;
  }
}

/* Valores fijos de la tienda, los mismos que usa js/datos.js */
export const SHIP = 3.5;
export const FREE_SHIP = 60;
export const DEC_MAX = 10;
export const CIUDADES = ['Quito','Guayaquil','Cuenca','Loja','Ambato','Manta','Ibarra','Riobamba'];

/* Los mensajes son los mismos que muestra hoy el formulario del sitio */
export const normalizarCorreo = s => String(s ?? '').trim().toLowerCase();

export function validarCorreo(valor){
  const correo = normalizarCorreo(valor);
  if (!correo) throw new ErrorUsuario('Completa el campo Correo electrónico.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo))
    throw new ErrorUsuario('Escribe un correo válido, por ejemplo nombre@correo.com.');
  if (correo.length > 120) throw new ErrorUsuario('El correo no puede tener más de 120 caracteres.');
  return correo;
}

/* El celular es opcional. Vacío devuelve null */
export function validarTelefono(valor){
  const tel = String(valor ?? '').replace(/\s/g, '');
  if (!tel) return null;
  if (!/^09\d{8}$/.test(tel)) throw new ErrorUsuario('Escribe un celular de 10 dígitos que empiece con 09.');
  return tel;
}

export function validarClave(valor){
  const clave = typeof valor === 'string' ? valor : '';
  if (clave.length < 8) throw new ErrorUsuario('La contraseña debe tener al menos 8 caracteres.');
  /* bcrypt solo lee los primeros 72 bytes, más allá se ignorarían sin avisar */
  if (Buffer.byteLength(clave) > 72) throw new ErrorUsuario('La contraseña no puede pasar de 72 caracteres.');
  return clave;
}

export function validarTexto(valor, nombreCampo, max){
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) throw new ErrorUsuario(`Completa el campo ${nombreCampo}.`);
  if (texto.length > max) throw new ErrorUsuario(`El campo ${nombreCampo} no puede tener más de ${max} caracteres.`);
  return texto;
}

/* Un campo de texto que se puede dejar vacío. Sin valor devuelve '' porque la columna es NOT NULL */
export function validarTextoOpcional(valor, nombreCampo, max){
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') throw new ErrorUsuario(`El campo ${nombreCampo} no es válido.`);
  const texto = valor.trim();
  if (texto.length > max) throw new ErrorUsuario(`El campo ${nombreCampo} no puede tener más de ${max} caracteres.`);
  return texto;
}
