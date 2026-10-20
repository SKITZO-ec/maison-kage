// globalSetup de Playwright, recrea la base de pruebas antes de cada corrida
// El módulo de la herramienta es ESM, por eso se carga con import() dinámico
module.exports = async function(){
  const { cargarConfig } = await import('../../backend/config.js');
  const { prepararBd } = await import('../../herramientas/preparar-bd.mjs');
  await prepararBd(cargarConfig(['--prueba']).bd);
};
