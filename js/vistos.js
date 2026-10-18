/* MAISON KAGE · Vistos recientemente
   Guarda en la pestaña los últimos perfumes que la persona abrió,
   para que los reconozca sin tener que recordar su nombre */
const VISTOS_KEY = 'mk-vistos';
function leerVistos(){
  try{ const l = JSON.parse(sessionStorage.getItem(VISTOS_KEY)); return Array.isArray(l) ? l.filter(id => byId(id)) : []; }catch(e){ return []; }
}
function registrarVisto(id){
  const l = [id, ...leerVistos().filter(x => x!==id)].slice(0,8);
  try{ sessionStorage.setItem(VISTOS_KEY, JSON.stringify(l)); }catch(e){}
}
/* Sección con hasta 4 perfumes vistos, sin el que se está mirando */
function vistosHTML(excluirId){
  const l = leerVistos().filter(id => id!==excluirId).slice(0,4).map(byId);
  if(!l.length) return '';
  return `<section class="${TW.block}" aria-labelledby="h-vistos">
      <h2 class="${TW.sectionTitle}" id="h-vistos"><span>Vistos recientemente</span></h2>
      <div class="${TW.grid}" id="vistos">${l.map(p => card(p)).join('')}</div>
    </section>`;
}
