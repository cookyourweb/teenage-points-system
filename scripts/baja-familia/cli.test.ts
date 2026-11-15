import { describe, expect, it, vi } from 'vitest'
import type { Resumen } from './adaptadores'
import { describirError, ejecutarCli, type DepsCli } from './cli'
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

const EMULADORES = { FIRESTORE_EMULATOR_HOST: 'localhost:8080', FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' }

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
    const codigo = await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, ...EMULADORES }, m.deps, m.salida)
    expect(codigo).toBe(0)
    expect(m.ejecutar).toHaveBeenCalledTimes(1)
    const t = m.texto()
    expect(t).toContain('Borrando la familia F del proyecto demo-proyecto')
    expect(t).toContain('familyId: F')
    expect(t).toContain('2026-11-15T10:00:00.000Z')
    expect(t).toContain('mongo.tasks: 2')
    expect(t).not.toContain('PRODUCCION')
  })

  it('avisaProduccion: sin emuladores advierte en --confirmar, tenga o no prefijo demo-', async () => {
    for (const proyecto of ['mi-proyecto-real', 'demo-proyecto']) {
      const m = montar()
      await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, FIREBASE_PROJECT_ID: proyecto }, m.deps, m.salida)
      expect(m.texto(), proyecto).toContain('PRODUCCION')
    }
    const m2 = montar()
    await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, ...EMULADORES }, m2.deps, m2.salida)
    expect(m2.texto()).not.toContain('PRODUCCION')
  })

  describe('emuladoresAMedias', () => {
    // Con solo uno, el otro SDK iria contra produccion y ademas se callaria el aviso.
    it.each([
      ['solo Firestore', { FIRESTORE_EMULATOR_HOST: 'localhost:8080' }, 'FIREBASE_AUTH_EMULATOR_HOST'],
      ['solo Auth', { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' }, 'FIRESTORE_EMULATOR_HOST'],
    ])('%s: mensaje y codigo 2 sin leer nada', async (_caso, emul, falta) => {
      for (const args of [['--familia', 'F'], ['--familia', 'F', '--confirmar']]) {
        const m = montar()
        expect(await ejecutarCli(args, { ...ENTORNO, ...emul }, m.deps, m.salida)).toBe(2)
        expect(m.texto()).toContain(`Falta ${falta}`)
        expect(m.leerInventario).not.toHaveBeenCalled()
        expect(m.ejecutar).not.toHaveBeenCalled()
      }
    })

    it('con emuladores y Mongo que no es local avisa, sin imprimir la URI', async () => {
      const m = montar()
      const codigo = await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, ...EMULADORES }, m.deps, m.salida)
      expect(codigo).toBe(0)
      expect(m.texto()).toContain('AVISO: hay emuladores pero MONGODB_URI no apunta a localhost')
      expect(m.texto()).not.toContain('host/db')
    })

    it.each([
      ['mongodb://localhost:27017/points'],
      ['mongodb://127.0.0.1:27017/points?x=y'],
      ['mongodb://usuario:clave@localhost:27017,127.0.0.1:27018/points'],
    ])('con emuladores y Mongo local (%s) no avisa', async (uri) => {
      const m = montar()
      await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, ...EMULADORES, MONGODB_URI: uri }, m.deps, m.salida)
      expect(m.texto()).not.toContain('AVISO')
    })
  })

  it('faltaFamiliaMuestraUso: sin --familia o vacia, uso y codigo 2', async () => {
    for (const args of [[], ['--familia'], ['--familia', ''], ['--confirmar'], ['--familia', '--confirmar'], ['--familia=-x']]) {
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

  describe('validacionDeLaUriDeMongo', () => {
    // Sin base en la URI el cliente usa `test`: las membresias de otra familia
    // no se verian y se borraria la cuenta de un adulto compartido.
    it.each([
      ['sin base', 'mongodb://usuario:clave@host-mongo:27017'],
      ['sin base y con barra', 'mongodb://host-mongo:27017/'],
      ['sin base y con query', 'mongodb://host-mongo:27017/?retryWrites=true'],
      ['base test', 'mongodb://host-mongo:27017/test'],
      ['base test con query', 'mongodb+srv://usuario:clave@cluster.example.net/test?x=y'],
      ['srv sin base', 'mongodb+srv://usuario:clave@cluster.example.net'],
      ['no es una URI de Mongo', 'http://host-mongo/points'],
    ])('rechaza %s con codigo 2 antes de leer nada', async (_caso, uri) => {
      const m = montar()
      const codigo = await ejecutarCli(['--familia', 'F'], { ...ENTORNO, MONGODB_URI: uri }, m.deps, m.salida)
      expect(codigo).toBe(2)
      expect(m.texto()).toContain('MONGODB_URI debe incluir el nombre de la base de datos')
      expect(m.texto()).not.toContain('usuario:clave')
      expect(m.leerInventario).not.toHaveBeenCalled()
    })

    it.each([
      ['mongodb://host-mongo:27017/points'],
      ['mongodb+srv://usuario:clave@cluster.example.net/points?x=y'],
      ['mongodb://h1:27017,h2:27017/points?replicaSet=rs'],
    ])('acepta %s', async (uri) => {
      const m = montar()
      const codigo = await ejecutarCli(['--familia', 'F'], { ...ENTORNO, MONGODB_URI: uri }, m.deps, m.salida)
      expect(codigo).toBe(0)
      expect(m.leerInventario).toHaveBeenCalledTimes(1)
    })
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
    expect(t).not.toContain('Firestore caido') // el mensaje del SDK ya no se imprime
    expect(t).toContain('mongo/tasks: 2')
    expect(t).toContain('mongo/membresias: 1')
    expect(t).toContain('Vuelve a ejecutar el mismo comando')
  })

  it('falloAMitadDiceQuePasoFallo: nombra fuente/coleccion del paso que cayo', async () => {
    const m = montar({
      ejecutar: async (plan, alCompletar) => {
        alCompletar(plan.pasos[0], 2)
        throw new Error('boom')
      },
    })
    await ejecutarCli(['--familia', 'F', '--confirmar'], ENTORNO, m.deps, m.salida)
    expect(m.texto()).toContain('Paso que fallo: mongo/membresias')
  })

  describe('erroresSinDatosPersonales', () => {
    const PELIGRO = `.../documents/usuarios/uidSecreto1 ${EMAIL} host-mongo-interno:27017`
    const envenenado = () => Object.assign(new Error(PELIGRO), { code: 14 })

    it('en el ensayo (leer inventario)', async () => {
      const m = montar({ leerInventario: async () => { throw envenenado() } })
      expect(await ejecutarCli(['--familia', 'F'], ENTORNO, m.deps, m.salida)).toBe(1)
      for (const x of ['uidSecreto1', EMAIL, 'host-mongo-interno']) expect(m.texto()).not.toContain(x)
      expect(m.texto()).toContain('Error')
    })

    it('al ejecutar con --confirmar', async () => {
      const m = montar({ ejecutar: async () => { throw envenenado() } })
      expect(await ejecutarCli(['--familia', 'F', '--confirmar'], ENTORNO, m.deps, m.salida)).toBe(1)
      for (const x of ['uidSecreto1', EMAIL, 'host-mongo-interno']) expect(m.texto()).not.toContain(x)
    })

    it('describirError: solo nombre y code; el detalle con DEBUG_BAJA=1', () => {
      const e = envenenado()
      expect(describirError(e, {})).toBe('Error (code 14)')
      expect(describirError(e, { DEBUG_BAJA: '1' })).toContain('uidSecreto1')
      expect(describirError('texto raro con uidSecreto1', {})).not.toContain('uidSecreto1')
    })

    it('con DEBUG_BAJA=1 el detalle completo si aparece en la salida', async () => {
      const m = montar({ ejecutar: async () => { throw envenenado() } })
      await ejecutarCli(['--familia', 'F', '--confirmar'], { ...ENTORNO, DEBUG_BAJA: '1' }, m.deps, m.salida)
      expect(m.texto()).toContain('uidSecreto1')
    })
  })
})
