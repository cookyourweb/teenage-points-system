import { describe, expect, it, vi } from 'vitest'
import type { Resumen } from './adaptadores'
import { ejecutarCli, type DepsCli } from './cli'
import type { Inventario } from './tipos'

// Datos sembrados que NUNCA pueden aparecer en la salida: la constancia y el
// ensayo van a la terminal (y luego a un fichero) y no deben llevar PII.
const EMAIL = 'madre.secreta@example.com'
const NOMBRE = 'Lucia Perez Secreta'

const inventario = (): Inventario => ({
  familyId: 'F',
  familia: { adultos: [{ uid: 'uidMadre', enOtraFamilia: false }], hijos: ['hijoA'] },
  mongo: { tasks: ['m1', 'm2'], membresias: ['mem1'] },
  firestore: {
    weeklyTasks: ['w1'],
    privileges: [],
    privilegeHistory: [],
    privilegeHistoryPorHijo: [],
    invitaciones: [],
    childPoints: ['F_hijoA'],
    tasks: [],
    usuariosPorFamilia: [{ uid: 'uidMadre', enOtraFamilia: false }],
  },
})

const ENTORNO = { FIREBASE_PROJECT_ID: 'demo-proyecto', MONGODB_URI: `mongodb://${EMAIL}:${NOMBRE}@host/db` }

// Adaptadores falsos: cuentan cuantas veces se pide borrar y no tocan red.
const montar = (sobre: Partial<DepsCli> = {}) => {
  const leerInventario = vi.fn(async () => inventario())
  const ejecutar = vi.fn<DepsCli['ejecutar']>(async (plan, alCompletar) => {
    const recuentos: Record<string, number> = {}
    for (const paso of plan.pasos) {
      alCompletar(paso, paso.ids.length)
      recuentos[`${paso.fuente}.${paso.coleccion}`] = paso.ids.length
    }
    return { familyId: 'F', fecha: '2026-11-15T10:00:00.000Z', recuentos } satisfies Resumen
  })
  const lineas: string[] = []
  const errores: string[] = []
  const salida = { info: (l: string) => lineas.push(l), error: (l: string) => errores.push(l) }
  const deps: DepsCli = { leerInventario, ejecutar, ...sobre }
  return { deps, salida, leerInventario, ejecutar, texto: () => [...lineas, ...errores].join('\n'), lineas, errores }
}

describe('ejecutarCli', () => {
  it('ensayoNoEscribe: sin --confirmar lista recuentos y no borra nada', async () => {
    const m = montar()
    const codigo = await ejecutarCli(['--familia', 'F'], ENTORNO, m.deps, m.salida)
    expect(codigo).toBe(0)
    expect(m.ejecutar).toHaveBeenCalledTimes(0)
    expect(m.texto()).toContain('mongo/tasks: 2')
    expect(m.texto()).toContain('firestore/childPoints: 1')
    expect(m.texto()).toContain('ENSAYO: no se ha borrado nada. Repite con --confirmar para borrar.')
  })

  it('confirmarEjecuta: con --confirmar borra, muestra el destino y la constancia', async () => {
    const m = montar()
    const codigo = await ejecutarCli(['--familia', 'F', '--confirmar'], ENTORNO, m.deps, m.salida)
    expect(codigo).toBe(0)
    expect(m.ejecutar).toHaveBeenCalledTimes(1)
    const t = m.texto()
    expect(t).toContain('demo-proyecto')
    expect(t).toContain('F')
    expect(t).toContain('2026-11-15T10:00:00.000Z')
    expect(t).toContain('mongo.tasks: 2')
    expect(t).not.toContain('PRODUCCION')
  })

  it('avisaProduccion: proyecto sin demo- y sin emulador advierte en --confirmar', async () => {
    const m = montar()
    const entorno = { ...ENTORNO, FIREBASE_PROJECT_ID: 'mi-proyecto-real' }
    await ejecutarCli(['--familia', 'F', '--confirmar'], entorno, m.deps, m.salida)
    expect(m.texto()).toContain('PRODUCCION')
    const m2 = montar()
    await ejecutarCli(['--familia', 'F', '--confirmar'], { ...entorno, FIRESTORE_EMULATOR_HOST: 'localhost:8080' }, m2.deps, m2.salida)
    expect(m2.texto()).not.toContain('PRODUCCION')
  })

  it('faltaFamiliaMuestraUso: sin --familia o vacia, uso y codigo 2', async () => {
    for (const args of [[], ['--familia'], ['--familia', ''], ['--confirmar']]) {
      const m = montar()
      expect(await ejecutarCli(args, ENTORNO, m.deps, m.salida)).toBe(2)
      expect(m.texto()).toContain('Uso:')
      expect(m.leerInventario).not.toHaveBeenCalled()
    }
  })

  it('faltanVariables: sin FIREBASE_PROJECT_ID o MONGODB_URI, mensaje y codigo 2', async () => {
    for (const falta of ['FIREBASE_PROJECT_ID', 'MONGODB_URI']) {
      const m = montar()
      const entorno = { ...ENTORNO, [falta]: undefined }
      expect(await ejecutarCli(['--familia', 'F'], entorno, m.deps, m.salida)).toBe(2)
      expect(m.texto()).toContain(falta)
      expect(m.leerInventario).not.toHaveBeenCalled()
    }
  })

  it('familiaInexistente: mensaje y codigo 1 sin borrar', async () => {
    const m = montar({ leerInventario: async () => ({ ...inventario(), familia: null }) })
    expect(await ejecutarCli(['--familia', 'F', '--confirmar'], ENTORNO, m.deps, m.salida)).toBe(1)
    expect(m.texto()).toContain('Familia no encontrada')
    expect(m.ejecutar).not.toHaveBeenCalled()
  })

  it('noImprimeDatosPersonales: ni emails, ni nombres, ni uids, ni la URI de Mongo', async () => {
    const inv = inventario()
    for (const args of [['--familia', 'F'], ['--familia', 'F', '--confirmar']]) {
      const m = montar({ leerInventario: async () => inv })
      await ejecutarCli(args, ENTORNO, m.deps, m.salida)
      const t = m.texto()
      for (const secreto of [EMAIL, NOMBRE, 'uidMadre', 'mongodb://']) expect(t).not.toContain(secreto)
    }
  })

  it('falloAMitadInforma: codigo != 0, pasos completados y que reejecutar termina', async () => {
    const m = montar({
      ejecutar: async (plan, alCompletar) => {
        alCompletar(plan.pasos[0], 2)
        alCompletar(plan.pasos[1], 1)
        throw new Error('Firestore caido')
      },
    })
    const codigo = await ejecutarCli(['--familia', 'F', '--confirmar'], ENTORNO, m.deps, m.salida)
    expect(codigo).not.toBe(0)
    const t = m.texto()
    expect(t).toContain('Firestore caido')
    expect(t).toContain('mongo/tasks: 2')
    expect(t).toContain('mongo/membresias: 1')
    expect(t).toContain('Vuelve a ejecutar el mismo comando')
  })
})
