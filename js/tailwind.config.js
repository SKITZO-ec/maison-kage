/* =========================================================
   MAISON KAGE · Configuración de Tailwind
   Paleta cerrada de 5 colores sólidos, sin opacidad.
   Diseño adaptable de escritorio hacia abajo:
     laptop  hasta 1180 px
     tablet  hasta 900 px
     movil   hasta 600 px
   ========================================================= */
tailwind.config = {
  theme: {
    screens: {
      laptop: { max: '1180px' },
      tablet: { max: '900px' },
      movil: { max: '600px' }
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      navy: '#121C2B',   // Azul Noche Índigo
      ivory: '#F9F7F2',  // Blanco Hueso / Marfil
      gold: '#C8A15A',   // Oro Imperial Satinado
      red: '#B32A26',    // Rojo Laca Carmín
      smoke: '#E2DFD8'   // Gris Humo Mineral
    },
    fontFamily: {
      serif: ['"Cormorant Garamond"', '"Cormorant"', '"Trajan Pro"', '"Cinzel"', '"EB Garamond"', 'Garamond', '"Baskerville"', '"Book Antiqua"', '"Times New Roman"', 'serif'],
      sans: ['"Inter"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif']
    }
  },
  plugins: [
    /* Reglas base que Tailwind no trae: los elementos con el atributo hidden
       siempre se ocultan y el foco del teclado se ve en rojo carmín */
    function ({ addBase }) {
      addBase({
        '[hidden]': { display: 'none !important' },
        ':focus-visible': { outline: '3px solid #B32A26', outlineOffset: '2px' }
      });
    }
  ]
};
