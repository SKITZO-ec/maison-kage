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
