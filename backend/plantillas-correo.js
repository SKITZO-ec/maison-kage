/* =========================================================
   MAISON KAGE · Plantillas de correo
   Cada función devuelve el asunto, el texto y el HTML
   ========================================================= */

const escapar = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Envoltorio simple y sobrio que comparten todos los correos */
function envolver(titulo, cuerpoHtml){
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a">
<h1 style="font-size:20px;letter-spacing:.08em;text-transform:uppercase">Maison Kage</h1>
<h2 style="font-size:17px;font-weight:normal">${escapar(titulo)}</h2>
${cuerpoHtml}
</div>`;
}

export function correoRecuperar(enlace){
  const asunto = 'Recupera tu contraseña de Maison Kage';
  const texto = `Hola,

Recibimos una solicitud para cambiar tu contraseña. Abre este enlace para elegir una nueva:

${enlace}

El enlace vence en 30 minutos y solo se puede usar una vez.

Si no pediste este cambio, ignora este correo.

Maison Kage`;
  const html = envolver('Recupera tu contraseña', `<p>Recibimos una solicitud para cambiar tu contraseña. Usa el botón para elegir una nueva.</p>
<p><a href="${escapar(enlace)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 20px;text-decoration:none">Cambiar contraseña</a></p>
<p style="font-size:13px">Si el botón no abre, copia este enlace en tu navegador<br>${escapar(enlace)}</p>
<p>El enlace vence en 30 minutos y solo se puede usar una vez.</p>
<p>Si no pediste este cambio, ignora este correo.</p>`);
  return { asunto, texto, html };
}

/* PENDIENTE Tarea 6 · la forma de pedido la define esa tarea y ella llena esta función */
export function correoPedido(/* pedido */){
  throw new Error('correoPedido se implementa en la Tarea 6');
}
