import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { como, crearEntorno, sembrar } from './entorno'

let env: RulesTestEnvironment

const miembro = (nombre: string, email: string) => ({ nombre, email, rol: 'padre' })

beforeAll(async () => {
  env = await crearEntorno()
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await sembrar(env, 'familias/F1', {
    miembros: { padres: { ana: miembro('Ana', 'ana@ejemplo.test') }, hijos: {} },
  })
  await sembrar(env, 'usuarios/ana', { rol: 'padre', familyId: 'F1' })
})

const usuarioEva = {
  nombre: 'Eva',
  email: 'eva@ejemplo.test',
  rol: 'padre',
  familyId: 'F2',
  fechaCreacion: '2026-11-13T00:00:00.000Z',
}

describe('alta de usuarios', () => {
  it('nadie se crea admin al darse de alta', async () => {
    await sembrar(env, 'familias/F2', {
      miembros: { padres: { eva: miembro('Eva', 'eva@ejemplo.test') }, hijos: {} },
    })
    await assertFails(setDoc(doc(como(env, 'eva'), 'usuarios/eva'), { ...usuarioEva, rol: 'admin' }))
  })

  it('nadie se apunta a una familia en la que no figura', async () => {
    await assertFails(setDoc(doc(como(env, 'eva'), 'usuarios/eva'), { ...usuarioEva, familyId: 'F1' }))
  })

  it('no se aceptan campos de más al crear el usuario', async () => {
    await sembrar(env, 'familias/F2', {
      miembros: { padres: { eva: miembro('Eva', 'eva@ejemplo.test') }, hijos: {} },
    })
    await assertFails(setDoc(doc(como(env, 'eva'), 'usuarios/eva'), { ...usuarioEva, esAdmin: true }))
  })

  it('el alta normal funciona: familia propia y luego usuario', async () => {
    await assertSucceeds(
      setDoc(doc(como(env, 'eva'), 'familias/F2'), {
        miembros: { padres: { eva: miembro('Eva', 'eva@ejemplo.test') }, hijos: {} },
      }),
    )
    await assertSucceeds(setDoc(doc(como(env, 'eva'), 'usuarios/eva'), usuarioEva))
  })

  it('un usuario existente sigue sin poder cambiarse el rol', async () => {
    await assertFails(updateDoc(doc(como(env, 'ana'), 'usuarios/ana'), { rol: 'admin' }))
  })
})

describe('alta de familias', () => {
  it('no se crea una familia metiendo a otro adulto', async () => {
    await assertFails(
      setDoc(doc(como(env, 'eva'), 'familias/F3'), {
        miembros: {
          padres: { eva: miembro('Eva', 'eva@ejemplo.test'), ana: miembro('Ana', 'ana@ejemplo.test') },
          hijos: {},
        },
      }),
    )
  })

  it('un miembro lee su familia y un extraño no', async () => {
    await assertSucceeds(getDoc(doc(como(env, 'ana'), 'familias/F1')))
    await assertFails(getDoc(doc(como(env, 'eva'), 'familias/F1')))
  })
})
