/* =========================================================
   MAISON KAGE · Configuración de Tailwind
   Paleta cerrada de 5 colores sólidos, sin opacidad.
   Diseño adaptable revisado en los tres rangos de IHC
     escritorio  1024 px o más (laptop afina hasta 1180 px)
     tablet      de 768 a 1023 px
     movil       de 320 a 767 px
   ========================================================= */
tailwind.config = {
  theme: {
    screens: {
      laptop: { max: '1180px' },
      tablet: { max: '1023px' },
      movil: { max: '767px' }
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
    /* Reglas base que Tailwind no trae. Los elementos con el atributo hidden
       siempre se ocultan, el foco del teclado se ve en rojo carmín, el encabezado
       fijo no tapa el elemento con foco y las animaciones se apagan si la persona lo pide */
    function ({ addBase }) {
      addBase({
        '[hidden]': { display: 'none !important' },
        ':focus-visible': { outline: '3px solid #B32A26', outlineOffset: '2px' },
        'html': { scrollPaddingTop: '120px' },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { animationDuration: '0.01ms !important', animationIterationCount: '1 !important', transitionDuration: '0.01ms !important', scrollBehavior: 'auto !important' }
        }
      });
    }
  ]
};
