import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guardas de arquitectura.
 *
 * Estos tests no prueban comportamiento: prueban que la estructura sigue siendo la
 * que decidimos. Son baratos y aburridos, y existen porque el 31-jul-2026 aparecio
 * una copia entera de customTaskService guardada como
 * src/components/FamilyPointsOverview.tsx, con nombre de componente y sin serlo.
 *
 * Estuvo ahi mas de un año sin molestar, porque las dos copias hablaban con
 * Firestore y coincidian. En cuanto una migro a la API de Java y la otra no, la
 * aplicacion paso a tener dos fuentes de verdad para las mismas tareas: se creaba
 * una tarea en Mongo y la vista del hijo, que leia Firestore, no la veia.
 *
 * Un test de comportamiento no lo habria detectado: las dos copias funcionaban.
 * Lo que fallaba era que hubiera dos.
 */

const SRC = join(__dirname, '..');

/** Todos los ficheros .ts y .tsx de src, menos los tests. */
const ficherosFuente = (dir: string = SRC): string[] =>
  readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      return entrada === '__tests__' || entrada === 'node_modules' ? [] : ficherosFuente(ruta);
    }
    return /\.tsx?$/.test(entrada) ? [ruta] : [];
  });

const relativo = (ruta: string) => ruta.slice(SRC.length + 1);

describe('las operaciones de tareas viven en un solo sitio', () => {
  // Si estas funciones se exportan desde dos ficheros, hay dos caminos a los datos
  // y tarde o temprano apuntan a backends distintos.
  const OPERACIONES = [
    'getTasksByFamily',
    'getActiveTasksByFamily',
    'addCustomTask',
    'updateCustomTask',
    'deleteCustomTask',
  ];

  it.each(OPERACIONES)('%s se exporta exactamente desde un fichero', (operacion) => {
    const exportadores = ficherosFuente()
      .filter((ruta) => new RegExp(`export const ${operacion}\\b`).test(readFileSync(ruta, 'utf8')))
      .map(relativo);

    expect(exportadores).toEqual(['services/customTaskService.ts']);
  });
});

describe('el adaptador de tareas no habla con Firestore', () => {
  it('customTaskService no importa firebase', () => {
    // El dominio Task esta migrado a la API de Java. Si vuelve a aparecer una
    // importacion de firebase aqui, es que alguien reabrio el camino viejo.
    const contenido = readFileSync(join(SRC, 'services/customTaskService.ts'), 'utf8');

    expect(contenido).not.toMatch(/from ['"]firebase/);
  });
});

describe('los componentes no exportan servicios', () => {
  it('ningun fichero de components/ exporta operaciones de datos', () => {
    // Un fichero en components/ que exporta funciones de acceso a datos y ningun
    // componente esta mal nombrado, y lo que esta mal nombrado no se encuentra
    // cuando se busca.
    const infractores = ficherosFuente(join(SRC, 'components'))
      .filter((ruta) => {
        const contenido = readFileSync(ruta, 'utf8');
        const exportaDatos = /export const (get|fetch|add|update|delete)[A-Z]\w*\s*=\s*async/.test(contenido);
        const esComponente = /export default|:\s*React\.FC/.test(contenido);
        return exportaDatos && !esComponente;
      })
      .map(relativo);

    expect(infractores).toEqual([]);
  });
});
