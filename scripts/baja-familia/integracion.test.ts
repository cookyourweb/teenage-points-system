// Integracion: emuladores de Firestore y Auth (`firebase emulators:exec`) y un
// Mongo en memoria. Nada de esto toca el proyecto real ni el Mongo real: sin
// FIRESTORE_EMULATOR_HOST el test se niega a arrancar.
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { MongoClient, ObjectId, type Db } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ejecutar, leerInventario, type Fuentes } from './adaptadores'
import { borrarPorIds } from './mongo'
import { planificarBaja } from './plan'
import type { PlanBaja } from './tipos'

const F = 'famF'
const G = 'famG'

let mongod: MongoMemoryServer
let cliente: MongoClient
let fuentes: Fuentes
let firestore: Firestore
let mongo: Db

const existe = async (coleccion: string, id: string) =>
  (await firestore.collection(coleccion).doc(id).get()).exists

const contar = async (coleccion: string) => (await firestore.collection(coleccion).get()).size

const cuentaExiste = (uid: string) =>
  fuentes.auth.getUser(uid).then(
    () => true,
    () => false,
  )

// Siembra dos familias que comparten una madre ('compartida'), un catalogo
// comun y, para F, datos en cada coleccion del inventario.
async function sembrar() {
  const { auth } = fuentes
  const set = (c: string, id: string, data: Record<string, unknown>) =>
    firestore.collection(c).doc(id).set(data)

  await set('familias', F, {
    miembros: {
      padres: { padreF: { rol: 'admin' }, compartida: { rol: 'admin' } },
      hijos: { hijoF1: { nombre: 'x' }, hijoF2: { nombre: 'y' } },
    },
  })
  await set('familias', G, {
    miembros: { padres: { compartida: {}, padreG: {} }, hijos: { hijoG1: {} } },
  })

  await set('usuarios', 'padreF', { familyId: F })
  await set('usuarios', 'compartida', { familyId: G })
  await set('usuarios', 'padreG', { familyId: G })
  await set('usuarios', 'hijoF1', { familyId: F }) // un hijo con doc pero sin cuenta de Auth

  for (const uid of ['padreF', 'compartida', 'padreG']) await auth.createUser({ uid })

  await set('weeklyTasks', 'wF', { familyId: F })
  await set('weeklyTasks', 'wG', { familyId: G })
  await set('privileges', 'pF', { familyId: F })
  await set('privileges', 'pG', { familyId: G })
  await set('privilegeHistory', 'hF', { familyId: F, childId: 'hijoF1' })
  await set('privilegeHistory', 'hFviejo', { childId: 'hijoF2' }) // canje antiguo sin familyId
  await set('privilegeHistory', 'hG', { familyId: G, childId: 'hijoG1' })
  await set('invitaciones', 'iF', { familyId: F })
  await set('invitaciones', 'iG', { familyId: G })
  await set('childPoints', `${F}_hijoF1`, { puntos: 3 })
  await set('childPoints', `${F}_hijoF2`, { puntos: 4 })
  await set('childPoints', `${G}_hijoG1`, { puntos: 5 })
  await set('tasks', 'tF', { childId: 'hijoF1' })
  await set('tasks', 'tG', { childId: 'hijoG1' })
  for (const c of ['tareas', 'recompensas', 'categorias']) await set(c, 'comun', { n: 1 })

  await mongo.collection('tasks').insertMany([
    { _id: new ObjectId(), familyId: F, titulo: 'a' },
    { _id: new ObjectId(), familyId: F, titulo: 'b' },
    { _id: new ObjectId(), familyId: G, titulo: 'c' },
  ])
  await mongo.collection('membresias').insertMany([
    { _id: new ObjectId(), uid: 'padreF', familyId: F },
    { _id: new ObjectId(), uid: 'compartida', familyId: F },
    { _id: new ObjectId(), uid: 'compartida', familyId: G },
    { _id: new ObjectId(), uid: 'padreG', familyId: G },
  ])
}

async function limpiar() {
  const raiz = firestore.recursiveDelete(firestore.collection('familias'))
  await raiz
  for (const c of [
    'usuarios', 'weeklyTasks', 'privileges', 'privilegeHistory', 'invitaciones',
    'childPoints', 'tasks', 'tareas', 'recompensas', 'categorias',
  ]) {
    await firestore.recursiveDelete(firestore.collection(c))
  }
  for (const c of ['tasks', 'membresias']) await mongo.collection(c).deleteMany({})
  const { users } = await fuentes.auth.listUsers(1000)
  if (users.length) await fuentes.auth.deleteUsers(users.map((u) => u.uid))
}

// Estado esperado tras la baja completa de F: nada de F; G, el catalogo y la
// madre compartida intactos. Lo comparten el borrado directo y las reanudaciones.
async function comprobarEstadoFinal() {
  // Nada de F
  expect(await mongo.collection('tasks').countDocuments({ familyId: F })).toBe(0)
  expect(await mongo.collection('membresias').countDocuments({ familyId: F })).toBe(0)
  for (const [c, id] of [
    ['familias', F], ['weeklyTasks', 'wF'], ['privileges', 'pF'], ['privilegeHistory', 'hF'],
    ['privilegeHistory', 'hFviejo'], ['invitaciones', 'iF'], ['childPoints', `${F}_hijoF1`],
    ['childPoints', `${F}_hijoF2`], ['tasks', 'tF'], ['usuarios', 'padreF'], ['usuarios', 'hijoF1'],
  ] as const) {
    expect(await existe(c, id), `${c}/${id} deberia haberse borrado`).toBe(false)
  }
  expect(await cuentaExiste('padreF')).toBe(false)

  // Todo lo de G, el catalogo y la madre compartida siguen
  expect(await mongo.collection('tasks').countDocuments({ familyId: G })).toBe(1)
  expect(await mongo.collection('membresias').countDocuments({ familyId: G })).toBe(2)
  for (const [c, id] of [
    ['familias', G], ['weeklyTasks', 'wG'], ['privileges', 'pG'], ['privilegeHistory', 'hG'],
    ['invitaciones', 'iG'], ['childPoints', `${G}_hijoG1`], ['tasks', 'tG'],
    ['usuarios', 'padreG'], ['usuarios', 'compartida'],
    ['tareas', 'comun'], ['recompensas', 'comun'], ['categorias', 'comun'],
  ] as const) {
    expect(await existe(c, id), `${c}/${id} deberia seguir`).toBe(true)
  }
  expect(await cuentaExiste('compartida')).toBe(true)
  expect(await cuentaExiste('padreG')).toBe(true)
}

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Este test solo corre contra emuladores: usa `npm run test:baja`.')
  }
  const app =
    getApps().find((a) => a.name === 'baja-test') ??
    initializeApp({ projectId: 'demo-teenage-points' }, 'baja-test')
  firestore = getFirestore(app)
  mongod = await MongoMemoryServer.create()
  cliente = await MongoClient.connect(mongod.getUri())
  mongo = cliente.db('baja-test')
  fuentes = { firestore, auth: getAuth(app), mongo }
})

afterAll(async () => {
  await cliente?.close()
  await mongod?.stop()
})

beforeEach(async () => {
  await limpiar()
  await sembrar()
})

describe('baja de una familia contra emuladores', () => {
  it('borraTodoYSoloLoDeLaFamilia', async () => {
    const plan = planificarBaja(await leerInventario(F, fuentes))
    await ejecutar(plan, fuentes)
    await comprobarEstadoFinal()
  })

  // Simula una caida tras `k` pasos ejecutando solo el prefijo del plan, y
  // reanuda con un inventario nuevo: debe llegar al mismo estado final.
  describe('reanudacionTrasCaida', () => {
    const indiceDe = (plan: PlanBaja, fuente: string, coleccion: string) => {
      const i = plan.pasos.findIndex((p) => p.fuente === fuente && p.coleccion === coleccion)
      expect(i, `${fuente}/${coleccion} deberia estar en el plan`).toBeGreaterThanOrEqual(0)
      return i
    }
    const casos: [string, (plan: PlanBaja) => number][] = [
      ['tras borrar las cuentas de Auth', (plan) => indiceDe(plan, 'auth', 'usuarios') + 1],
      ['tras borrar usuarios', (plan) => indiceDe(plan, 'firestore', 'usuarios') + 1],
    ]
    it.each(casos)('cae %s y al reintentar termina igual', async (_caso, cuantos) => {
      const plan = planificarBaja(await leerInventario(F, fuentes))
      const k = cuantos(plan)
      expect(k).toBeLessThan(plan.pasos.length) // familias (el ancla) aun no se ha borrado
      await ejecutar({ ...plan, pasos: plan.pasos.slice(0, k) }, fuentes)
      expect(await existe('familias', F)).toBe(true)

      const reanudado = planificarBaja(await leerInventario(F, fuentes))
      await ejecutar(reanudado, fuentes)
      await comprobarEstadoFinal()
    })
  })

  it('masDeQuinientos', async () => {
    const bw = firestore.bulkWriter()
    for (let i = 0; i < 1200; i++) {
      void bw.set(firestore.collection('weeklyTasks').doc(`masiva${i}`), { familyId: F })
    }
    await bw.close()

    const plan = planificarBaja(await leerInventario(F, fuentes))
    const resumen = await ejecutar(plan, fuentes)

    expect(resumen.recuentos['firestore.weeklyTasks']).toBe(1201)
    expect(await contar('weeklyTasks')).toBe(1) // solo wG
  })

  it('idempotente', async () => {
    const plan = planificarBaja(await leerInventario(F, fuentes))
    const primera = await ejecutar(plan, fuentes)
    expect(primera.recuentos['firestore.familias']).toBe(1)

    const segunda = await ejecutar(plan, fuentes)
    expect(Object.values(segunda.recuentos).every((n) => n === 0)).toBe(true)
    expect(segunda.familyId).toBe(F)
  })

  it('avisaDeCadaPasoCompletadoEnOrden', async () => {
    const plan = planificarBaja(await leerInventario(F, fuentes))
    const vistos: string[] = []
    await ejecutar(plan, fuentes, undefined, (paso, borrados) => {
      expect(borrados).toBeLessThanOrEqual(paso.ids.length)
      vistos.push(`${paso.fuente}.${paso.coleccion}`)
    })
    expect(vistos).toEqual(plan.pasos.map((p) => `${p.fuente}.${p.coleccion}`))
  })

  it('calculaElInventarioConEnOtraFamiliaParaTodosLosUid', async () => {
    const inv = await leerInventario(F, fuentes)
    expect(inv.familia?.hijos.sort()).toEqual(['hijoF1', 'hijoF2'])
    const adultos = Object.fromEntries(inv.familia!.adultos.map((a) => [a.uid, a.enOtraFamilia]))
    expect(adultos).toEqual({ padreF: false, compartida: true })
    expect(inv.firestore.usuariosPorFamilia.map((a) => a.uid).sort()).toEqual(['hijoF1', 'padreF'])
    expect(inv.firestore.privilegeHistoryPorHijo).toEqual(['hFviejo'])
    expect(inv.firestore.childPoints.sort()).toEqual([`${F}_hijoF1`, `${F}_hijoF2`])
    expect(inv.mongo.tasks).toHaveLength(2)
    expect(inv.mongo.membresias).toHaveLength(2)
  })

  it('unUsuariosConOtraFamilyIdSeConservaAunqueNoTengaMembresia', async () => {
    // Solo 'usuarios.familyId' apunta a G: enOtraFamilia por esa via, sin Mongo
    await mongo.collection('membresias').deleteMany({ uid: 'compartida', familyId: G })
    await firestore.collection('familias').doc(F).update({ 'miembros.padres.soloUsuarios': {} })
    await firestore.collection('usuarios').doc('soloUsuarios').set({ familyId: G })
    const inv = await leerInventario(F, fuentes)
    const a = inv.familia!.adultos.find((x) => x.uid === 'soloUsuarios')
    expect(a?.enOtraFamilia).toBe(true)
  })

  it('unCanjeConFamilyIdNullEsAntiguoYEntraPorHijo', async () => {
    await firestore.collection('privilegeHistory').doc('hFnulo').set({ familyId: null, childId: 'hijoF1' })
    const inv = await leerInventario(F, fuentes)
    expect(inv.firestore.privilegeHistoryPorHijo.sort()).toEqual(['hFnulo', 'hFviejo'])
    await ejecutar(planificarBaja(inv), fuentes)
    expect(await existe('privilegeHistory', 'hFnulo')).toBe(false)
    expect(await existe('privilegeHistory', 'hG')).toBe(true)
  })

  it('seNiegaABorrarColeccionesFueraDeLaListaBlanca', async () => {
    const plan: PlanBaja = {
      familyId: F,
      pasos: [
        { fuente: 'firestore', coleccion: 'tareas', ids: ['comun'] },
        { fuente: 'mongo', coleccion: 'catalogo', ids: [] },
      ],
    }
    await expect(ejecutar(plan, fuentes)).rejects.toThrow(/tareas/)
    expect(await existe('tareas', 'comun')).toBe(true)
  })

  it('unaCuentaDeAuthInexistenteNoEsUnError', async () => {
    const plan: PlanBaja = {
      familyId: F,
      pasos: [{ fuente: 'auth', coleccion: 'usuarios', ids: ['padreF', 'nuncaExistio'] }],
    }
    const resumen = await ejecutar(plan, fuentes)
    expect(resumen.recuentos['auth.usuarios']).toBe(1)
    expect(await cuentaExiste('padreF')).toBe(false)
  })

  it('borraEnMongoTantoIdsObjectIdComoIdsDeTexto', async () => {
    await mongo.collection('tasks').insertOne({ _id: 'texto-libre' as unknown as ObjectId, familyId: F })
    const inv = await leerInventario(F, fuentes)
    expect(inv.mongo.tasks).toContain('texto-libre')
    await ejecutar(planificarBaja(inv), fuentes)
    expect(await mongo.collection('tasks').countDocuments({ familyId: F })).toBe(0)
  })

  it('mongoNoBorraUnDocumentoDeOtraFamiliaAunqueSuIdEstePedido', async () => {
    const ajeno = await mongo.collection('tasks').findOne({ familyId: G })
    const propio = await mongo.collection('tasks').findOne({ familyId: F })
    const borrados = await borrarPorIds(mongo, 'tasks', [String(ajeno!._id), String(propio!._id)], F)
    expect(borrados).toBe(1)
    expect(await mongo.collection('tasks').countDocuments({ familyId: G })).toBe(1)
    expect(await mongo.collection('tasks').countDocuments({ _id: propio!._id })).toBe(0)
  })
})
