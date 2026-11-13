import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { como, crearEntorno, sembrar } from './entorno'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await crearEntorno()
})

afterAll(async () => {
  await env.cleanup()
})

// Solo datos inventados: el contenido real del método no entra en el repo.
beforeEach(async () => {
  await env.clearFirestore()
  await sembrar(env, 'familias/F1', {
    miembros: { padres: { ana: { nombre: 'Ana', email: 'ana@ejemplo.test', rol: 'padre' } }, hijos: {} },
  })
  await sembrar(env, 'usuarios/ana', { rol: 'padre', familyId: 'F1' })
  await sembrar(env, 'usuarios/root', { rol: 'admin', familyId: 'F1' })
  await sembrar(env, 'categorias/c1', {
    titulo: '[FICTICIO] Categoría',
    definicion: '[FICTICIO]',
    preguntas: [],
  })
})

describe('categorias (contenido del método)', () => {
  it('sin sesión no se lee el contenido', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'categorias/c1')))
  })

  it('con sesión sí se lee', async () => {
    await assertSucceeds(getDoc(doc(como(env, 'ana'), 'categorias/c1')))
  })

  it('un padre no escribe categorías', async () => {
    await assertFails(setDoc(doc(como(env, 'ana'), 'categorias/c2'), { titulo: '[FICTICIO]' }))
  })

  it('un admin sí escribe', async () => {
    await assertSucceeds(setDoc(doc(como(env, 'root'), 'categorias/c2'), { titulo: '[FICTICIO]' }))
  })
})
