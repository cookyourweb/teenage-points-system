import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { como, comoAnonima, crearEntorno, sembrar } from './entorno'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await crearEntorno()
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await sembrar(env, 'categorias/c1', { titulo: '[FICTICIO] Categoría' })
})

const familiaDe = (uid: string) => ({
  miembros: { padres: { [uid]: { nombre: 'X', email: 'x@ejemplo.test', rol: 'padre' } }, hijos: {} },
})

// Una cuenta anónima la crea cualquiera con una llamada, sin pasar por la app.
// Su token es válido, pero no identifica a nadie: para las reglas no hay sesión.
describe('cuenta anónima', () => {
  it('no lee el contenido del método', async () => {
    await assertFails(getDoc(doc(comoAnonima(env, 'anon'), 'categorias/c1')))
  })

  it('no se crea una familia', async () => {
    await assertFails(setDoc(doc(comoAnonima(env, 'anon'), 'familias/FA'), familiaDe('anon')))
  })

  it('una cuenta con contraseña sí lee y sí crea su familia', async () => {
    await assertSucceeds(getDoc(doc(como(env, 'eva'), 'categorias/c1')))
    await assertSucceeds(setDoc(doc(como(env, 'eva'), 'familias/FE'), familiaDe('eva')))
  })
})
