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
import { contarCuentasConservadas, planificarBaja } from './plan'
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
  // Un valor que empieza por `-` es otra opcion (`--familia --confirmar`), no un id.
  return familia === '' || familia.startsWith('-') ? null : { familia, confirmar }
}

// Nombre de la base de datos de una URI de Mongo (mongodb:// o mongodb+srv://,
// con o sin query string), o null si la URI no trae ninguno. Sin `new URL`: una
// URI con varios hosts (`h1:27017,h2:27017`) no es una URL valida.
export function nombreDeBaseMongo(uri: string): string | null {
  const m = /^mongodb(?:\+srv)?:\/\/[^/?#]*\/([^?#]*)/.exec(uri.trim())
  if (!m) return null
  let nombre = m[1]
  try {
    nombre = decodeURIComponent(nombre)
  } catch {
    // un % mal formado se deja tal cual: igualmente no sera un nombre valido
  }
  return nombre === '' ? null : nombre
}

// El cliente de Mongo sin base en la URI usa `test`, que esta vacia: las
// membresias de otra familia no se verian y se borraria la cuenta de Auth de
// un adulto compartido. Por eso se exige una base explicita y distinta de `test`.
const baseValida = (uri: string): boolean => {
  const nombre = nombreDeBaseMongo(uri)
  return nombre !== null && nombre !== 'test'
}

// Hosts de una URI de Mongo (puede traer varios, separados por coma).
const hostsMongo = (uri: string): string[] => {
  const m = /^mongodb(?:\+srv)?:\/\/([^/?#]*)/.exec(uri.trim())
  if (!m) return []
  const sinCredenciales = m[1].slice(m[1].lastIndexOf('@') + 1)
  return sinCredenciales.split(',').map((h) => h.replace(/:\d+$/, '').replace(/^\[|\]$/g, ''))
}
const LOCALES = new Set(['localhost', '127.0.0.1', '::1'])
const mongoEsLocal = (uri: string): boolean => {
  const hosts = hostsMongo(uri)
  return hosts.length > 0 && hosts.every((h) => LOCALES.has(h))
}

const linea = (paso: Paso, n: number) => `  ${paso.fuente}/${paso.coleccion}: ${n}`

// Los errores de los SDK pueden traer rutas con uid (`.../documents/usuarios/<uid>`),
// emails o hosts de Mongo: por defecto solo se muestra nombre y code. El detalle
// completo exige DEBUG_BAJA=1 (decision consciente de quien ejecuta).
export function describirError(e: unknown, entorno: Record<string, string | undefined>): string {
  if (!(e instanceof Error)) return 'error desconocido'
  if (entorno.DEBUG_BAJA === '1') return e.message
  const code = (e as { code?: unknown }).code
  return code === undefined ? e.name : `${e.name} (code ${String(code)})`
}

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
  if (!baseValida(entorno.MONGODB_URI as string)) {
    salida.error(
      'MONGODB_URI debe incluir el nombre de la base de datos y no puede ser "test" ' +
        '(ej. mongodb://host:27017/points): sin ella no se veria la membresia de otras familias.',
    )
    return 2
  }
  // Los emuladores van los dos o ninguno: con uno solo, el otro SDK iria contra
  // produccion y ademas se suprimiria el aviso de PRODUCCION.
  const emuladorFirestore = Boolean(entorno.FIRESTORE_EMULATOR_HOST)
  const emuladorAuth = Boolean(entorno.FIREBASE_AUTH_EMULATOR_HOST)
  if (emuladorFirestore !== emuladorAuth) {
    const falta = emuladorFirestore ? 'FIREBASE_AUTH_EMULATOR_HOST' : 'FIRESTORE_EMULATOR_HOST'
    salida.error(`Falta ${falta}: los emuladores de Firestore y Auth van los dos o ninguno (si no, uno iria contra produccion).`)
    return 2
  }
  const emulador = emuladorFirestore && emuladorAuth
  const { familia, confirmar } = parsed
  const proyecto = entorno.FIREBASE_PROJECT_ID as string
  if (emulador && !mongoEsLocal(entorno.MONGODB_URI as string)) {
    salida.info('AVISO: hay emuladores pero MONGODB_URI no apunta a localhost: la baja tocaria el Mongo real.')
  }

  let plan: PlanBaja
  let conservadas = 0
  const lineaConservadas = () => `  cuentas conservadas por pertenecer a otra familia: ${conservadas}`
  try {
    const inventario = await deps.leerInventario(familia)
    plan = planificarBaja(inventario)
    conservadas = contarCuentasConservadas(inventario)
  } catch (e) {
    if (e instanceof FamiliaNoEncontrada) {
      salida.error(e.message)
      return 1
    }
    salida.error(`No se pudo leer el inventario (no se ha borrado nada): ${describirError(e, entorno)}`)
    return 1
  }

  // Solo recuentos: nunca ids, emails ni nombres (la salida acaba en un fichero).
  if (!confirmar) {
    salida.info(`Ensayo de baja de la familia ${familia} (proyecto ${proyecto}). Se borraria:`)
    for (const paso of plan.pasos) salida.info(linea(paso, paso.ids.length))
    salida.info(lineaConservadas())
    salida.info('ENSAYO: no se ha borrado nada. Repite con --confirmar para borrar.')
    return 0
  }

  if (!emulador) {
    salida.info(`ATENCION: el proyecto "${proyecto}" es PRODUCCION (sin emuladores): el borrado sera real.`)
  }
  salida.info(`Borrando la familia ${familia} del proyecto ${proyecto}...`)

  const hechos: string[] = []
  try {
    const resumen = await deps.ejecutar(plan, (paso, n) => hechos.push(linea(paso, n)))
    salida.info('BAJA COMPLETADA. Guarda esta constancia fuera del repo:')
    salida.info(`  fecha: ${resumen.fecha}`)
    salida.info(`  familyId: ${resumen.familyId}`)
    for (const [clave, n] of Object.entries(resumen.recuentos)) salida.info(`  ${clave}: ${n}`)
    salida.info(lineaConservadas())
    return 0
  } catch (e) {
    salida.error(`FALLO a mitad de la baja: ${describirError(e, entorno)}`)
    const fallo = plan.pasos[hechos.length]
    if (fallo) salida.error(`Paso que fallo: ${fallo.fuente}/${fallo.coleccion}`)
    salida.error(hechos.length > 0 ? 'Pasos completados antes del fallo:' : 'No se completo ningun paso.')
    for (const h of hechos) salida.error(h)
    salida.error('Vuelve a ejecutar el mismo comando: es idempotente y termina lo que falte.')
    return 1
  }
}

// Arranque real: credenciales por Application Default Credentials
// (`gcloud auth application-default login`), nunca un fichero de clave.
// Las conexiones son perezosas: ejecutarCli valida argumentos y variables
// ANTES de pedir las fuentes, asi un uso erroneo no abre ninguna conexion.
async function main(): Promise<number> {
  const entorno = process.env
  const salida: Salida = { info: (l) => console.log(l), error: (l) => console.error(l) }
  let mongoClient: MongoClient | undefined
  let fuentes: Promise<Fuentes> | undefined
  const obtener = (): Promise<Fuentes> =>
    (fuentes ??= (async () => {
      const app = initializeApp({ projectId: entorno.FIREBASE_PROJECT_ID })
      mongoClient = new MongoClient(entorno.MONGODB_URI as string)
      await mongoClient.connect()
      return { firestore: getFirestore(app), auth: getAuth(app), mongo: mongoClient.db(nombreDeBaseMongo(entorno.MONGODB_URI as string) as string) }
    })())
  try {
    return await ejecutarCli(
      process.argv.slice(2),
      entorno,
      {
        leerInventario: async (id) => leerInventario(id, await obtener()),
        ejecutar: async (plan, alCompletar) => ejecutar(plan, await obtener(), undefined, alCompletar),
      },
      salida,
    )
  } finally {
    await mongoClient?.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (codigo) => process.exit(codigo),
    (e) => {
      console.error(`Error inesperado: ${describirError(e, process.env)}`)
      process.exit(1)
    },
  )
}
