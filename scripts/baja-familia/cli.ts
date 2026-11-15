// CLI de baja de una familia (RGPD). Por defecto solo ENSAYA: lee, planifica e
// imprime recuentos; borra unicamente con --confirmar. La logica vive en
// `ejecutarCli` (pura respecto a la red: recibe los adaptadores inyectados)
// para poder probarla entera; `main` es solo el arranque real.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { MongoClient } from 'mongodb'
import { pathToFileURL } from 'node:url'
import { ejecutar, leerInventario, type Fuentes, type Resumen } from './adaptadores'
import { planificarBaja } from './plan'
import { FamiliaNoEncontrada, type Inventario, type Paso, type PlanBaja } from './tipos'

export type DepsCli = {
  leerInventario: (familyId: string) => Promise<Inventario>
  // `alCompletar` se llama tras cada paso terminado: es lo que permite
  // informar, si algo falla a mitad, que pasos ya se hicieron.
  ejecutar: (plan: PlanBaja, alCompletar: (paso: Paso, borrados: number) => void) => Promise<Resumen>
}
export type Salida = { info: (linea: string) => void; error: (linea: string) => void }

const USO = 'Uso: npm run baja:familia -- --familia <id> [--confirmar]'

// Devuelve el valor de --familia, o null si falta, esta vacio o hay argumentos
// desconocidos (mejor parar que ignorar un typo como `--confirmr`).
function leerArgs(args: string[]): { familia: string; confirmar: boolean } | null {
  let familia = ''
  let confirmar = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--confirmar') confirmar = true
    else if (a === '--familia') familia = args[++i] ?? ''
    else if (a.startsWith('--familia=')) familia = a.slice('--familia='.length)
    else return null
  }
  familia = familia.trim()
  return familia === '' ? null : { familia, confirmar }
}

const linea = (paso: Paso, n: number) => `  ${paso.fuente}/${paso.coleccion}: ${n}`

export async function ejecutarCli(
  args: string[],
  entorno: Record<string, string | undefined>,
  deps: DepsCli,
  salida: Salida,
): Promise<number> {
  const parsed = leerArgs(args)
  if (!parsed) {
    salida.error(USO)
    return 2
  }
  const faltan = ['FIREBASE_PROJECT_ID', 'MONGODB_URI'].filter((v) => !entorno[v])
  if (faltan.length > 0) {
    salida.error(`Faltan variables de entorno obligatorias: ${faltan.join(', ')}`)
    return 2
  }
  const { familia, confirmar } = parsed
  const proyecto = entorno.FIREBASE_PROJECT_ID as string

  let plan: PlanBaja
  try {
    plan = planificarBaja(await deps.leerInventario(familia))
  } catch (e) {
    if (e instanceof FamiliaNoEncontrada) {
      salida.error(e.message)
      return 1
    }
    salida.error(`No se pudo leer el inventario (no se ha borrado nada): ${(e as Error).message}`)
    return 1
  }

  // Solo recuentos: nunca ids, emails ni nombres (la salida acaba en un fichero).
  if (!confirmar) {
    salida.info(`Ensayo de baja de la familia ${familia} (proyecto ${proyecto}). Se borraria:`)
    for (const paso of plan.pasos) salida.info(linea(paso, paso.ids.length))
    salida.info('ENSAYO: no se ha borrado nada. Repite con --confirmar para borrar.')
    return 0
  }

  const emulador = Boolean(entorno.FIRESTORE_EMULATOR_HOST)
  if (!proyecto.startsWith('demo-') && !emulador) {
    salida.info(`ATENCION: el proyecto "${proyecto}" parece PRODUCCION (no es demo- ni emulador).`)
  }
  salida.info(`Borrando la familia ${familia} del proyecto ${proyecto}...`)

  const hechos: string[] = []
  try {
    const resumen = await deps.ejecutar(plan, (paso, n) => hechos.push(linea(paso, n)))
    salida.info('BAJA COMPLETADA. Guarda esta constancia fuera del repo:')
    salida.info(`  fecha: ${resumen.fecha}`)
    salida.info(`  familyId: ${resumen.familyId}`)
    for (const [clave, n] of Object.entries(resumen.recuentos)) salida.info(`  ${clave}: ${n}`)
    return 0
  } catch (e) {
    salida.error(`FALLO a mitad de la baja: ${(e as Error).message}`)
    salida.error(hechos.length > 0 ? 'Pasos completados antes del fallo:' : 'No se completo ningun paso.')
    for (const h of hechos) salida.error(h)
    salida.error('Vuelve a ejecutar el mismo comando: es idempotente y termina lo que falte.')
    return 1
  }
}

// Arranque real: credenciales por Application Default Credentials
// (`gcloud auth application-default login`), nunca un fichero de clave.
async function main(): Promise<number> {
  const entorno = process.env
  const salida: Salida = { info: (l) => console.log(l), error: (l) => console.error(l) }
  // Validamos antes de abrir conexiones: ejecutarCli lo repite, pero asi no se
  // crean clientes si ya se sabe que falta algo.
  if (!entorno.FIREBASE_PROJECT_ID || !entorno.MONGODB_URI) {
    return ejecutarCli(process.argv.slice(2), entorno, {} as DepsCli, salida)
  }
  const app = initializeApp({ projectId: entorno.FIREBASE_PROJECT_ID })
  const mongoClient = new MongoClient(entorno.MONGODB_URI)
  try {
    await mongoClient.connect()
    const fuentes: Fuentes = { firestore: getFirestore(app), auth: getAuth(app), mongo: mongoClient.db() }
    return await ejecutarCli(
      process.argv.slice(2),
      entorno,
      {
        leerInventario: (id) => leerInventario(id, fuentes),
        ejecutar: (plan, alCompletar) => ejecutar(plan, fuentes, undefined, alCompletar),
      },
      salida,
    )
  } finally {
    await mongoClient.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(`Error inesperado: ${(e as Error).message}`)
      process.exit(1)
    },
  )
}
