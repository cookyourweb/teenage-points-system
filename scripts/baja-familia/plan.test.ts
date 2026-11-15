import { describe, expect, it } from 'vitest'
import { planificarBaja } from './plan'
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
    usuariosPorFamilia: ['padre1', 'madre1', 'hijoA'],
  },
})

// Devuelve los ids del paso, o undefined si no existe: asi un paso ausente
// falla por asercion (toEqual) y no por un TypeError.
const idsDe = (plan: PlanBaja, fuente: string, coleccion: string) =>
  plan.pasos.find((p) => p.fuente === fuente && p.coleccion === coleccion)?.ids

const indice = (plan: PlanBaja, fuente: string, coleccion: string) =>
  plan.pasos.findIndex((p) => p.fuente === fuente && p.coleccion === coleccion)

describe('planificarBaja', () => {
  it('ordenDeBorrado: Mongo, datos de Firestore, usuarios, familias y Auth al final', () => {
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
      'firestore:usuarios',
      'firestore:familias',
      'auth:usuarios',
    ])
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
    expect(idsDe(plan, 'auth', 'usuarios')).toEqual(['padre1'])
  })

  it('canjesViejosPorHijo: el historial sin familyId de un hijo de F entra', () => {
    const plan = planificarBaja(base())
    expect(idsDe(plan, 'firestore', 'privilegeHistory')).toEqual(['h1', 'h2'])
  })

  it('noTocaElCatalogo: ningun paso sobre tareas, recompensas ni categorias', () => {
    const plan = planificarBaja(base())
    const prohibidas = ['tareas', 'recompensas', 'categorias']
    expect(plan.pasos.filter((p) => prohibidas.includes(p.coleccion))).toEqual([])
  })

  it('sinDuplicados: un id hallado por dos vias sale una vez', () => {
    const inv = base()
    inv.firestore.privilegeHistoryPorHijo = ['h1', 'h2']
    inv.firestore.usuariosPorFamilia = ['padre1', 'padre1', 'hijoA']
    const plan = planificarBaja(inv)
    expect(idsDe(plan, 'firestore', 'privilegeHistory')).toEqual(['h1', 'h2'])
    expect(idsDe(plan, 'firestore', 'usuarios')).toEqual(['padre1', 'madre1', 'hijoA'])
  })

  it('familias va despues de usuarios y antes de auth', () => {
    const plan = planificarBaja(base())
    expect(indice(plan, 'firestore', 'familias')).toBeGreaterThan(indice(plan, 'firestore', 'usuarios'))
    expect(indice(plan, 'auth', 'usuarios')).toBeGreaterThan(indice(plan, 'firestore', 'familias'))
  })
})
