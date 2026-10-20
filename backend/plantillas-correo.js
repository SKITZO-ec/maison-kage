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

const dinero = n => '$' + Number(n).toFixed(2);
const URL_RASTREO = 'https://www.servientrega.com/wps/portal/rastreo-envio';
const PASOS = ['1. Copia tu número de guía', '2. Abre la página de rastreo de Servientrega', '3. Pega el número y consulta'];

export function correoPedido(pedido){
  const asunto = `Recibimos tu pedido ${pedido.num}`;
  const envio = pedido.entrega === 'envio';
  const entrega = envio ? 'Envío a domicilio con Servientrega' : 'Retiro en el local';
  const lineas = pedido.items.map(i => `${i.nombre} · ${i.desc} · ${i.qty} x ${dinero(i.unit)} = ${dinero(i.qty * i.unit)}`);

  const texto = `Hola ${pedido.envio.nombre},

Recibimos tu pedido ${pedido.num} y ya está en proceso.

Estado En proceso
Entrega ${entrega}

${lineas.join('\n')}

Subtotal ${dinero(pedido.sub)}
Envío ${pedido.ship ? dinero(pedido.ship) : 'Gratis'}
Total ${dinero(pedido.total)}
${envio ? `
Dirección ${pedido.envio.dir}, ${pedido.envio.ciudad}
Número de guía ${pedido.guia}

Para seguir tu envío
${PASOS[0]}
${PASOS[1]}
${URL_RASTREO}
${PASOS[2]}
` : ''}
Gracias por comprar en Maison Kage.`;

  const filas = pedido.items.map(i => `<tr><td>${escapar(i.nombre)}<br><span style="font-size:13px">${escapar(i.desc)} · ${i.qty} x ${escapar(dinero(i.unit))}</span></td><td style="text-align:right">${escapar(dinero(i.qty * i.unit))}</td></tr>`).join('');
  const bloqueEnvio = envio ? `<p>Dirección ${escapar(pedido.envio.dir)}, ${escapar(pedido.envio.ciudad)}</p>
<p>Número de guía <strong>${escapar(pedido.guia)}</strong></p>
<p><strong>Para seguir tu envío</strong></p>
<ol style="list-style:none;padding:0;margin:0 0 16px"><li>${escapar(PASOS[0])}</li><li>${escapar(PASOS[1])}<br><a href="${URL_RASTREO}">${escapar(URL_RASTREO)}</a></li><li>${escapar(PASOS[2])}</li></ol>` : '';
  const html = envolver(`Pedido ${pedido.num}`, `<p>Hola ${escapar(pedido.envio.nombre)}, recibimos tu pedido y ya está <strong>En proceso</strong>.</p>
<p>${escapar(entrega)}</p>
<table style="width:100%;border-collapse:collapse">${filas}
<tr><td>Subtotal</td><td style="text-align:right">${escapar(dinero(pedido.sub))}</td></tr>
<tr><td>Envío</td><td style="text-align:right">${pedido.ship ? escapar(dinero(pedido.ship)) : 'Gratis'}</td></tr>
<tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${escapar(dinero(pedido.total))}</strong></td></tr></table>
${bloqueEnvio}<p>Gracias por comprar en Maison Kage.</p>`);
  return { asunto, texto, html };
}
