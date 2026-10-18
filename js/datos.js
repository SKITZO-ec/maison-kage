/* =========================================================
   MAISON KAGE · Constantes de la tienda
   Los perfumes están en productos.js
   ========================================================= */
const ORIGENES = {arabe:'Árabe', disenador:'Diseñador', nicho:'Nicho'};
const PUBLICOS = {hombre:'Hombre', mujer:'Mujer', unisex:'Unisex'};
const FAMILIAS = {citrico:'Cítrico y fresco', floral:'Floral', amaderado:'Amaderado', oriental:'Oriental y ámbar', gourmand:'Gourmand', aromatico:'Aromático', cuero:'Cuero y especiado'};
const OCASIONES = ['Oficina','Diario','Citas','Noche','Verano','Eventos'];
const CONCENTRACIONES = ['Eau de Toilette','Eau de Parfum','Parfum','Extrait'];
const DEC_SIZES = [2,5,10];
const DEC_SPRAYS = {2:'≈ 30 atomizaciones',5:'≈ 75 atomizaciones',10:'≈ 150 atomizaciones'};
const DEC_MAX = 10, SHIP = 3.5, FREE_SHIP = 60;
/* Local para retiro (datos de ejemplo del prototipo) */
const LOCAL = {dir:'Av. República de El Salvador N34-127 y Suiza, Quito', horario:'Lunes a sábado, de 10:00 a 19:00', plazo:'Listo para retirar en 24 horas', dias:7};
const RASTREO_URL = 'https://www.servientrega.com/wps/portal/rastreo-envio';

/* Modo de uso según la concentración. Se queda aquí hasta que pase a Ayuda */
const USO_CONC = {
  'Eau de Toilette':'Es una Eau de Toilette, más ligera y fresca. Si quieres que dure toda la jornada, reaplica a media tarde.',
  'Eau de Parfum':'Es una Eau de Parfum, con buena duración en la piel. Con 3 o 4 atomizaciones te acompaña gran parte del día.',
  'Parfum':'Es un Parfum, una concentración alta. Con 2 atomizaciones es suficiente.',
  'Extrait':'Es un Extrait, la concentración más intensa. Con 1 o 2 atomizaciones es suficiente.'
};
const USO_PASOS = [
  'Aplica de 2 a 4 atomizaciones a unos 15 cm de la piel, en el cuello, las muñecas o detrás de las orejas.',
  'No frotes las muñecas después de aplicar, porque eso apaga las notas de salida.',
  'Sobre la piel hidratada el aroma dura más. Puedes aplicar una crema sin olor antes del perfume.',
  'Guarda el frasco cerrado, lejos del sol y del calor. El baño no es el mejor lugar por la humedad.'
];

const CIUDADES =['Quito','Guayaquil','Cuenca','Loja','Ambato','Manta','Ibarra','Riobamba'];
