/* =========================================================
   MAISON KAGE · Correo
   En pruebas solo guarda en la bandeja, sin clave de Gmail
   escribe en la consola y con clave usa el SMTP de Gmail
   ========================================================= */
import nodemailer from 'nodemailer';

export function crearCorreo(config){
  const bandeja = [];
  const { usuario, claveApp } = config.gmail || {};
  let transporte = null;

  async function enviar({ para, asunto, texto, html }){
    try{
      if (config.nodeEnv === 'test'){
        bandeja.push({ para, asunto, texto, html });
        return;
      }
      if (!claveApp){
        console.log(`[correo] Para: ${para}\nAsunto: ${asunto}\n${texto}`);
        return;
      }
      transporte ??= nodemailer.createTransport({ service: 'gmail', auth: { user: usuario, pass: claveApp } });
      await transporte.sendMail({ from: `Maison Kage <${usuario}>`, to: para, subject: asunto, text: texto, html });
    }catch(e){
      /* Un correo que falla no debe tumbar la petición que lo pidió */
      console.error('No se pudo enviar el correo', e.message);
    }
  }

  return { enviar, bandeja };
}
