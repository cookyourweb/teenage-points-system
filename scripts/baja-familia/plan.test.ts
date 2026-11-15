import { describe, expect, it } from 'vitest'
import { COLECCIONES_PERMITIDAS, planificarBaja } from './plan'
import { FamiliaNoEncontrada, type Inventario, type PlanBaja } from './tipos'

const base = (): Inventario => ({
  familyId: 'F',
  familia: {
    adultos: [
      { uid: 'padre1', enOtraFamilia: false },
      { uid: 'madre1', enOtraFamilia: false },
    ],
    hijos: ['hijoA', 'hijoB'],
  },
  mongo: { tasks: ['m1', 'm2'], membresias: ['mem1', 'mem2'] },
  firestore: {
    weeklyTasks: ['w1'],
    privileges: ['p1'],
    privilegeHistory: ['h1'],
    privilegeHistoryPorHijo: ['h2'],
    invitaciones: ['i1'],
    childPoints: ['F_hijoA', 'F_hijoB'],
    tasks: ['t1'],
    usuariosPorFamilia: [
      { uid: 'padre1', enOtraFamilia: false },
      { uid: 'madre1', enOtraFamilia: false },
      { uid: 'hijoA', enOtraFamilia: false },
    ],
  },
})

// Devuelve los ids del paso, o undefined si no existe: asi un paso ausente
// falla por asercion (toEqual) y no por un TypeError.
const idsDe = (plan: PlanBaja, fuente: string, coleccion: string) =>
  plan.pasos.find((p) => p.fuente === fuente && p.coleccion === coleccion)?.ids

const indice = (plan: PlanBaja, fuente: string, coleccion: string) =>
  plan.pasos.findIndex((p) => p.fuente === fuente && p.coleccion === coleccion)

describe('planificarBaja', () => {
  it('ordenDeBorrado: Mongo, datos, auth, usuarios y familias al final', () => {
    const plan = planificarBaja(base())
    expect(plan.pasos.map((p) => `${p.fuente}:${p.coleccion}`)).toEqual([
      'mongo:tasks',
      'mongo:membresias',
      'firestore:weeklyTasks',
      'firestore:privileges',
      'firestore:privilegeHistory',
      'firestore:invitaciones',
      'firestore:childPoints',
      'firestore:tasks',
      'auth:usuarios',
      'firestore:usuarios',
      'firestore:familias',
    ])
  })

  it('elPlanLlevaElFamilyIdExplicito', () => {
    expect(planificarBaja(base()).familyId).toBe('F')
  })

  it('familiaInexistenteLanza', () => {
    const inv = { ...base(), familia: null }
    expect(() => planificarBaja(inv)).toThrow(FamiliaNoEncontrada)
  })

  it('adultoEnOtraFamiliaSeConserva: fuera de usuarios y de auth', () => {
    const inv = base()
    inv.familia!.adultos[1] = { uid: 'madre1', enOtraFamilia: true }
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'firestore', 'usuarios')).not.toContain('madre1')
    expect(idsDe(plan, 'auth', 'usuarios')).not.toContain('madre1')
    expect(idsDe(plan, 'auth', 'usuarios')).toContain('padre1')
  })

  it('canjesViejosPorHijo: el historial sin familyId de un hijo de F entra', () => {
    const plan = planificarBaja(base())
    expect(idsDe(plan, 'firestore', 'privilegeHistory')).toEqual(['h1', 'h2'])
  })

  it('soloColeccionesPermitidas: cada paso cae en la lista blanca de su fuente', () => {
    const plan = planificarBaja(base())
    expect(plan.pasos.length).toBeGreaterThan(0)
    for (const p of plan.pasos) {
      expect(COLECCIONES_PERMITIDAS[p.fuente]).toContain(p.coleccion)
    }
    const todas = Object.values(COLECCIONES_PERMITIDAS).flat()
    expect(todas).toEqual(expect.arrayContaining(['tasks', 'familias', 'usuarios']))
    for (const catalogo of ['tareas', 'recompensas', 'categorias']) {
      expect(todas).not.toContain(catalogo)
    }
  })

  it('reanudableTrasCaida: sin datos pero con familias/usuarios el plan aun incluye auth', () => {
    const inv = base()
    inv.mongo = { tasks: [], membresias: [] }
    inv.firestore = {
      ...inv.firestore,
      weeklyTasks: [],
      privileges: [],
      privilegeHistory: [],
      privilegeHistoryPorHijo: [],
      invitaciones: [],
      childPoints: [],
      tasks: [],
    }
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'auth', 'usuarios')).toEqual(['padre1', 'madre1', 'hijoA'])
    expect(idsDe(plan, 'firestore', 'familias')).toEqual(['F'])
  })

  it('cuentaSoloEnUsuariosTambienSeBorra: uid en usuariosPorFamilia que no esta en padres', () => {
    const inv = base()
    inv.firestore.usuariosPorFamilia.push({ uid: 'huerfano', enOtraFamilia: false })
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'auth', 'usuarios')).toContain('huerfano')
    expect(idsDe(plan, 'firestore', 'usuarios')).toContain('huerfano')
  })

  it('uid de usuariosPorFamilia en otra familia no sale ni en usuarios ni en auth', () => {
    const inv = base()
    inv.firestore.usuariosPorFamilia.push({ uid: 'compartido', enOtraFamilia: true })
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'auth', 'usuarios')).not.toContain('compartido')
    expect(idsDe(plan, 'firestore', 'usuarios')).not.toContain('compartido')
  })

  it('childPointsAjenoSeDescarta: un id sin prefijo F_ no entra', () => {
    const inv = base()
    inv.firestore.childPoints = ['F_hijoA', 'G_hijoX', 'hijoB']
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'firestore', 'childPoints')).toEqual(['F_hijoA'])
  })

  it('sinDuplicados: un id hallado por dos vias sale una vez', () => {
    const inv = base()
    inv.firestore.privilegeHistoryPorHijo = ['h1', 'h2']
    inv.firestore.usuariosPorFamilia = [
      { uid: 'padre1', enOtraFamilia: false },
      { uid: 'padre1', enOtraFamilia: false },
      { uid: 'hijoA', enOtraFamilia: false },
    ]
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'firestore', 'privilegeHistory')).toEqual(['h1', 'h2'])
    expect(idsDe(plan, 'firestore', 'usuarios')).toEqual(['padre1', 'madre1', 'hijoA'])
  })

  it('familias es la ultima (ancla para reanudar) y auth va antes que usuarios', () => {
    const plan = planificarBaja(base())
    expect(indice(plan, 'firestore', 'familias')).toBe(plan.pasos.length - 1)
    expect(indice(plan, 'auth', 'usuarios')).toBeLessThan(indice(plan, 'firestore', 'usuarios'))
  })
})
