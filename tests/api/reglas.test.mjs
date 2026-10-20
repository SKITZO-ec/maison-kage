/* Las constantes del servidor deben ser las mismas que usa el sitio */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { SHIP, FREE_SHIP, DEC_MAX, CIUDADES } from '../../backend/reglas.js';

const raiz = path.resolve(import.meta.dirname, '..', '..');

test('las constantes de reglas.js coinciden con js/datos.js', () => {
  const contexto = vm.createContext({});
  /* const no queda como propiedad del contexto, por eso se devuelve en un objeto */
  const codigo = fs.readFileSync(path.join(raiz, 'js', 'datos.js'), 'utf8');
  const sitio = vm.runInContext(`${codigo}\n({ SHIP, FREE_SHIP, DEC_MAX, CIUDADES })`, contexto);
  assert.equal(SHIP, sitio.SHIP);
  assert.equal(FREE_SHIP, sitio.FREE_SHIP);
  assert.equal(DEC_MAX, sitio.DEC_MAX);
  assert.deepEqual([...CIUDADES], [...sitio.CIUDADES]);
});
