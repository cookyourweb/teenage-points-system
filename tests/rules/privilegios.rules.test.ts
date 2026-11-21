import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { como, crearEntorno, sembrar } from './entorno'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await crearEntorno()
})

afterAll(async () => {
  await env.cleanup()
})

const privilegio = (familyId: string) => ({
  name: 'Salir con amigos',
  description: 'Una tarde libre',
  points: 50,
  unlocked: false,
  familyId,
})

const canje = (familyId: string) => ({
  privilegeId: 'p1',
  childId: 'h1',
  familyId,
  redeemedBy: 'ana',
  dateUnlocked: '2026-11-14T10:00:00.000Z',
})

beforeEach(async () => {
  await env.clearFirestore()
  await sembrar(env, 'usuarios/ana', { rol: 'padre', familyId: 'F1' })
  await sembrar(env, 'usuarios/eva', { rol: 'padre', familyId: 'F2' })
  await sembrar(env, 'privileges/p1', privilegio('F1'))
  await sembrar(env, 'privilegeHistory/c1', canje('F1'))
})

describe('privileges (recompensas)', () => {
  it('un padre de la familia lee su privilegio', async () => {
    await assertSucceeds(getDoc(doc(como(env, 'ana'), 'privileges/p1')))
  })

  it('un padre de la familia crea un privilegio en su familia', async () => {
    await assertSucceeds(setDoc(doc(como(env, 'ana'), 'privileges/p2'), privilegio('F1')))
  })

  it('un extraño no lee el privilegio de otra familia', async () => {
    await assertFails(getDoc(doc(como(env, 'eva'), 'privileges/p1')))
  })

  it('un extraño no crea privilegios en otra familia', async () => {
    await assertFails(setDoc(doc(como(env, 'eva'), 'privileges/p2'), privilegio('F1')))
  })

  it('no se le cambia el familyId a un privilegio para llevárselo a otra familia', async () => {
    await assertFails(updateDoc(doc(como(env, 'ana'), 'privileges/p1'), { familyId: 'F2' }))
  })

  it('un padre de la familia borra su privilegio; un extraño no', async () => {
    await assertFails(deleteDoc(doc(como(env, 'eva'), 'privileges/p1')))
    await assertSucceeds(deleteDoc(doc(como(env, 'ana'), 'privileges/p1')))
  })

  it('listar con where familyId == la propia sí se permite', async () => {
    const q = query(collection(como(env, 'ana'), 'privileges'), where('familyId', '==', 'F1'))
    await assertSucceeds(getDocs(q))
  })

  it('listar sin filtro por familia se deniega', async () => {
    await assertFails(getDocs(collection(como(env, 'ana'), 'privileges')))
  })

  it('listar con el familyId de otra familia se deniega', async () => {
    const q = query(collection(como(env, 'eva'), 'privileges'), where('familyId', '==', 'F1'))
    await assertFails(getDocs(q))
  })
})

describe('privilegeHistory (libro de canjes)', () => {
  it('un padre registra un canje de su familia', async () => {
    await assertSucceeds(addDoc(collection(como(env, 'ana'), 'privilegeHistory'), canje('F1')))
  })

  it('no se registra un canje a nombre de otra familia', async () => {
    await assertFails(addDoc(collection(como(env, 'eva'), 'privilegeHistory'), canje('F1')))
  })

  it('un padre lee los canjes de su familia; un extraño no', async () => {
    await assertSucceeds(getDoc(doc(como(env, 'ana'), 'privilegeHistory/c1')))
    await assertFails(getDoc(doc(como(env, 'eva'), 'privilegeHistory/c1')))
  })

  it('listar el historial exige filtrar por la propia familia', async () => {
    const ok = query(collection(como(env, 'ana'), 'privilegeHistory'), where('familyId', '==', 'F1'))
    await assertSucceeds(getDocs(ok))
    await assertFails(getDocs(collection(como(env, 'ana'), 'privilegeHistory')))
  })

  it('un canje no se reescribe ni siquiera por la propia familia', async () => {
    await assertFails(updateDoc(doc(como(env, 'ana'), 'privilegeHistory/c1'), { childId: 'h2' }))
  })

  it('un canje no se borra ni siquiera por la propia familia', async () => {
    await assertFails(deleteDoc(doc(como(env, 'ana'), 'privilegeHistory/c1')))
  })
})
