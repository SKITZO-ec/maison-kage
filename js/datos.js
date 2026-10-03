/* =========================================================
   MAISON KAGE · Datos de ejemplo (sin base de datos)
   Catálogo fijo de perfumes, precios y constantes de la tienda
   ========================================================= */
const COLS = {noches:'Noches de oud y ámbar', frescos:'Frescos de verano', gourmand:'Dulces y gourmand', oficina:'Esenciales de oficina'};
const TIPOS = {arabe:'Árabe', disenador:'Diseñador'};
const PUBLICOS = {hombre:'Hombre', mujer:'Mujer', unisex:'Unisex'};
const OCASIONES = ['Día','Noche','Oficina','Citas','Fiesta','Verano','Invierno'];
const DEC_SIZES = [2,5,10];
const DEC_SPRAYS = {2:'≈ 30 atomizaciones',5:'≈ 75 atomizaciones',10:'≈ 150 atomizaciones'};
const DEC_MAX = 10, SHIP = 3.5, FREE_SHIP = 60;
/* Local para retiro (datos de ejemplo del prototipo) */
const LOCAL = {dir:'Av. República de El Salvador N34-127 y Suiza, Quito', horario:'Lunes a sábado, de 10:00 a 19:00', plazo:'Listo para retirar en 24 horas', dias:7};
const RASTREO_URL = 'https://www.servientrega.com/wps/portal/rastreo-envio';

const PRODUCTS = [
 {id:'khamrah',nombre:'Khamrah',marca:'Lattafa',tipo:'arabe',publico:'unisex',col:'gourmand',conc:'Eau de Parfum',p50:34,p100:48,oferta:20,tend:true,stock:6,
  notas:[['Canela','Nuez moscada','Bergamota'],['Dátiles','Praliné','Nardo'],['Vainilla','Haba tonka','Benjuí']],
  acordes:[['Dulce',100],['Cálido especiado',86],['Vainilla',78],['Ámbar',60]],ocasion:['Noche','Citas','Invierno'],dec:[3.5,7,12]},
 {id:'asad',nombre:'Asad',marca:'Lattafa',tipo:'arabe',publico:'hombre',col:'noches',conc:'Eau de Parfum',p50:26,p100:36,oferta:0,tend:true,stock:10,
  notas:[['Pimienta negra','Piña','Tabaco'],['Café','Pachulí','Iris'],['Vainilla','Ámbar','Benjuí']],
  acordes:[['Especiado',100],['Ámbar',82],['Vainilla',70],['Atabacado',55]],ocasion:['Noche','Invierno','Fiesta'],dec:[3,6,10]},
 {id:'club-de-nuit',nombre:'Club de Nuit Intense',marca:'Armaf',tipo:'arabe',publico:'hombre',col:'noches',conc:'Eau de Toilette',p50:30,p100:42,oferta:15,tend:false,stock:4,
  notas:[['Limón','Piña','Grosella negra'],['Abedul','Jazmín','Rosa'],['Almizcle','Ámbar gris','Vainilla']],
  acordes:[['Ahumado',100],['Cítrico',80],['Afrutado',66],['Amaderado',58]],ocasion:['Noche','Citas'],dec:[3,6,10]},
 {id:'hawas',nombre:'Hawas for Him',marca:'Rasasi',tipo:'arabe',publico:'hombre',col:'frescos',conc:'Eau de Parfum',p50:36,p100:52,oferta:0,tend:true,stock:8,
  notas:[['Manzana','Bergamota','Canela'],['Ciruela','Cardamomo','Azahar'],['Ámbar gris','Almizcle','Madera de deriva']],
  acordes:[['Acuático',100],['Afrutado',82],['Fresco',75],['Ámbar',50]],ocasion:['Día','Verano','Citas'],dec:[3.5,7,12]},
 {id:'9pm',nombre:'9PM',marca:'Afnan',tipo:'arabe',publico:'hombre',col:'gourmand',conc:'Eau de Parfum',p50:28,p100:39,oferta:25,tend:false,stock:12,
  notas:[['Manzana','Canela','Lavanda silvestre'],['Azahar','Lirio de los valles'],['Vainilla','Haba tonka','Pachulí']],
  acordes:[['Dulce',100],['Vainilla',85],['Afrutado',70],['Lavanda',55]],ocasion:['Noche','Fiesta'],dec:[3,6,10]},
 {id:'yara',nombre:'Yara',marca:'Lattafa',tipo:'arabe',publico:'mujer',col:'gourmand',conc:'Eau de Parfum',p50:24,p100:34,oferta:0,tend:true,stock:9,
  notas:[['Orquídea','Heliotropo','Mandarina'],['Acorde gourmand','Frutas tropicales'],['Vainilla','Almizcle','Sándalo']],
  acordes:[['Atalcado',100],['Dulce',90],['Vainilla',80],['Afrutado',60]],ocasion:['Día','Citas','Oficina'],dec:[3,6,10]},
 {id:'ana-abiyedh',nombre:'Ana Abiyedh',marca:'Lattafa',tipo:'arabe',publico:'unisex',col:'frescos',conc:'Eau de Parfum',p50:22,p100:30,oferta:0,tend:false,stock:0,
  notas:[['Pera','Bergamota'],['Almizcle blanco','Flor de algodón'],['Sándalo','Ámbar']],
  acordes:[['Almizclado',100],['Limpio',85],['Atalcado',70],['Afrutado',45]],ocasion:['Día','Oficina','Verano'],dec:[3,6,10]},
 {id:'sauvage',nombre:'Sauvage',marca:'Dior',tipo:'disenador',publico:'hombre',col:'oficina',conc:'Eau de Parfum',p50:118,p100:158,oferta:10,tend:true,stock:3,
  notas:[['Bergamota','Pimienta'],['Lavanda','Anís estrellado','Nuez moscada'],['Ambroxan','Vainilla']],
  acordes:[['Fresco especiado',100],['Aromático',85],['Cítrico',70],['Ámbar',55]],ocasion:['Día','Oficina','Citas'],dec:[6,12,20]},
 {id:'le-male-elixir',nombre:'Le Male Elixir',marca:'Jean Paul Gaultier',tipo:'disenador',publico:'hombre',col:'noches',conc:'Parfum',p50:112,p100:148,oferta:0,tend:true,stock:5,
  notas:[['Lavanda','Menta'],['Vainilla','Benjuí'],['Miel','Haba tonka','Tabaco']],
  acordes:[['Dulce',100],['Meloso',85],['Lavanda',70],['Atabacado',60]],ocasion:['Noche','Citas','Invierno'],dec:[6,12,20]},
 {id:'born-in-roma',nombre:'Born in Roma Uomo',marca:'Valentino',tipo:'disenador',publico:'hombre',col:'oficina',conc:'Eau de Toilette',p50:98,p100:132,oferta:15,tend:false,stock:7,
  notas:[['Sal mineral','Violeta'],['Salvia'],['Vetiver']],
  acordes:[['Amaderado',100],['Salado',80],['Aromático',70],['Verde',50]],ocasion:['Día','Oficina'],dec:[5,10,18]},
 {id:'libre',nombre:'Libre',marca:'Yves Saint Laurent',tipo:'disenador',publico:'mujer',col:'oficina',conc:'Eau de Parfum',p50:115,p100:152,oferta:0,tend:true,stock:4,
  notas:[['Lavanda','Mandarina','Grosella negra'],['Jazmín','Azahar'],['Vainilla de Madagascar','Almizcle','Cedro']],
  acordes:[['Lavanda',100],['Floral blanco',85],['Vainilla',75],['Cítrico',50]],ocasion:['Oficina','Día','Citas'],dec:[6,12,20]},
 {id:'good-girl',nombre:'Good Girl',marca:'Carolina Herrera',tipo:'disenador',publico:'mujer',col:'gourmand',conc:'Eau de Parfum',p50:102,p100:138,oferta:20,tend:false,stock:6,
  notas:[['Almendra','Café'],['Nardo','Jazmín sambac'],['Haba tonka','Cacao']],
  acordes:[['Dulce',100],['Floral blanco',80],['Cacao',70],['Almendrado',60]],ocasion:['Noche','Fiesta','Citas'],dec:[5,10,18]}
];

/* Descripción de cada perfume para la pestaña Descripción de la ficha */
const DESC = {
 "khamrah":"Khamrah es una fragancia ámbar especiada y gourmand pensada para el frío y la noche. Abre cálida con canela, nuez moscada y un toque de bergamota, y en el corazón los dátiles y el praliné le dan un dulzor que recuerda a un postre árabe. El fondo de vainilla, haba tonka y benjuí deja una estela envolvente.",
 "asad":"Asad es un ámbar especiado intenso y masculino. La pimienta negra y la piña abren con fuerza junto a un matiz de tabaco, el café y el pachulí le dan carácter en el corazón, y la vainilla con ámbar y benjuí cierra con calidez. Es una opción segura para salidas nocturnas y días fríos.",
 "club-de-nuit":"Club de Nuit Intense combina cítricos y frutas con un fondo ahumado. Abre con limón, piña y grosella negra, el abedul aporta su toque ahumado entre jazmín y rosa, y el almizcle con ámbar gris y vainilla deja una estela intensa. Es una fragancia de noche con mucha presencia.",
 "hawas":"Hawas for Him es una fragancia acuática y afrutada que se siente fresca y luminosa. La manzana y la bergamota abren con frescor, la ciruela y el cardamomo suman un matiz dulce y especiado, y el fondo de ámbar gris, almizcle y madera de deriva recuerda al mar. Ideal para el día y el clima cálido.",
 "9pm":"9PM es una fragancia dulce y avainillada hecha para la fiesta. Abre con manzana, canela y lavanda silvestre, pasa por un corazón floral de azahar y lirio de los valles, y termina en vainilla, haba tonka y pachulí. Es un aroma juvenil que se nota en la noche.",
 "yara":"Yara es una fragancia atalcada y dulce, suave y femenina. La orquídea, el heliotropo y la mandarina abren con delicadeza, el corazón de frutas tropicales le da un toque gourmand y el fondo de vainilla, almizcle y sándalo la vuelve cremosa. Funciona tanto para el día como para una cita.",
 "ana-abiyedh":"Ana Abiyedh es un aroma almizclado y limpio con sensación de ropa recién lavada. La pera y la bergamota abren frescas, el almizcle blanco y la flor de algodón forman su corazón, y el sándalo con ámbar le da un fondo suave. Es discreto y versátil para la oficina y los días de calor.",
 "sauvage":"Sauvage es una fragancia fresca, especiada y aromática. La bergamota y la pimienta abren con energía, la lavanda, el anís estrellado y la nuez moscada aportan el carácter aromático, y el ambroxan con vainilla deja un fondo ambarado y moderno. Es una opción versátil para la oficina y el día.",
 "le-male-elixir":"Le Male Elixir es un perfume dulce y meloso en concentración Parfum. La lavanda y la menta abren con frescura, la vainilla y el benjuí lo vuelven cálido, y la miel, el haba tonka y el tabaco le dan un fondo denso. Es una fragancia para la noche y el invierno.",
 "born-in-roma":"Born in Roma Uomo es una fragancia amaderada con un toque salado y mineral. Abre con sal mineral y violeta, la salvia aporta frescura aromática en el corazón y el vetiver le da un fondo verde y elegante. Es un aroma sobrio, pensado para el día y la oficina.",
 "libre":"Libre es un floral con lavanda que equilibra frescura y calidez. La lavanda, la mandarina y la grosella negra abren con brillo, el jazmín y el azahar forman su corazón floral blanco, y la vainilla de Madagascar con almizcle y cedro cierra suave. Es elegante para la oficina y el día.",
 "good-girl":"Good Girl es un floral gourmand que juega con el contraste entre lo dulce y lo intenso. La almendra y el café abren con fuerza, el nardo y el jazmín sambac aportan un corazón floral blanco, y el haba tonka con cacao deja un fondo cálido. Es una fragancia para la noche, las fiestas y las citas."
};

/* Modo de uso según la concentración del perfume */
const USO_CONC = {
  'Eau de Toilette':'Es una Eau de Toilette, más ligera y fresca. Si quieres que dure toda la jornada, reaplica a media tarde.',
  'Eau de Parfum':'Es una Eau de Parfum, con buena duración en la piel. Con 3 o 4 atomizaciones te acompaña gran parte del día.',
  'Parfum':'Es un Parfum, la concentración más alta. Con 2 atomizaciones es suficiente.'
};
const USO_PASOS = [
  'Aplica de 2 a 4 atomizaciones a unos 15 cm de la piel, en el cuello, las muñecas o detrás de las orejas.',
  'No frotes las muñecas después de aplicar, porque eso apaga las notas de salida.',
  'Sobre la piel hidratada el aroma dura más. Puedes aplicar una crema sin olor antes del perfume.',
  'Guarda el frasco cerrado, lejos del sol y del calor. El baño no es el mejor lugar por la humedad.'
];

const CIUDADES = ['Quito','Guayaquil','Cuenca','Loja','Ambato','Manta','Ibarra','Riobamba'];
