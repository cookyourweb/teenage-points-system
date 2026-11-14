import { beforeEach, describe, expect, it, vi } from 'vitest'

// Se mockea firebase/firestore: lo que importa aquí no es Firestore, sino QUÉ
// le pedimos. Las reglas exigen que toda consulta lleve el filtro de familia
// (tests/rules/privilegios.rules.test.ts); este test vigila que el servicio lo
// ponga, porque sin él Firestore rechaza la consulta entera.
const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  collection: vi.fn((_db: unknown, nombre: string) => ({ coleccion: nombre })),
  where: vi.fn((campo: string, op: string, valor: unknown) => ({ campo, op, valor })),
  query: vi.fn((origen: unknown, ...restricciones: unknown[]) => ({ origen, restricciones })),
  orderBy: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: m.collection,
  getDocs: m.getDocs,
  addDoc: m.addDoc,
  query: m.query,
  where: m.where,
  orderBy: m.orderBy,
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  Timestamp: { now: () => 'ahora' },
}))
vi.mock('../firebase', () => ({ db: {} }))

import {
  addPrivilege,
  getPrivilegeHistory,
  getPrivilegesByFamily,
  redeemPrivilege,
} from '../services/privilegesService'

const snap = (docs: Array<{ id: string; data: object }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
})

const filtros = () =>
  (m.query.mock.calls[0].slice(1) as Array<{ campo: string; valor: unknown }>).filter(
    (r) => r && 'campo' in r,
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('privilegesService: toda consulta lleva el filtro de familia', () => {
  it('getPrivilegesByFamily filtra por familyId y no depende de un índice compuesto', async () => {
    m.getDocs.mockResolvedValue(
      snap([
        { id: 'b', data: { name: 'B', points: 90 } },
        { id: 'a', data: { name: 'A', points: 10 } },
      ]),
    )

    const res = await getPrivilegesByFamily('F1')

    expect(filtros()).toEqual([{ campo: 'familyId', op: '==', valor: 'F1' }])
    expect(m.orderBy).not.toHaveBeenCalled()
    expect(res.map((p) => p.id)).toEqual(['a', 'b']) // ordenado en cliente por puntos
  })

  it('getPrivilegeHistory filtra por familyId', async () => {
    m.getDocs.mockResolvedValue(snap([]))

    await getPrivilegeHistory('F1')

    expect(filtros()).toEqual([{ campo: 'familyId', op: '==', valor: 'F1' }])
  })

  it('getPrivilegeHistory con hijo filtra por familyId Y childId, y ordena por fecha en cliente', async () => {
    m.getDocs.mockResolvedValue(
      snap([
        { id: 'viejo', data: { dateUnlocked: '2026-01-01' } },
        { id: 'nuevo', data: { dateUnlocked: '2026-06-01' } },
      ]),
    )

    const res = await getPrivilegeHistory('F1', 'h1')

    expect(filtros()).toEqual([
      { campo: 'familyId', op: '==', valor: 'F1' },
      { campo: 'childId', op: '==', valor: 'h1' },
    ])
    expect(m.orderBy).not.toHaveBeenCalled()
    expect((res as Array<{ id: string }>).map((h) => h.id)).toEqual(['nuevo', 'viejo'])
  })
})

describe('privilegesService: lo que se escribe lleva familyId', () => {
  it('redeemPrivilege guarda familyId en el canje', async () => {
    m.addDoc.mockResolvedValue({ id: 'c1' })

    await redeemPrivilege('F1', 'p1', 'h1', 'ana')

    expect(m.addDoc).toHaveBeenCalledTimes(1)
    expect(m.addDoc.mock.calls[0][1]).toMatchObject({
      familyId: 'F1',
      privilegeId: 'p1',
      childId: 'h1',
      redeemedBy: 'ana',
    })
  })

  it('addPrivilege conserva el familyId que se le da', async () => {
    m.addDoc.mockResolvedValue({ id: 'p9' })

    await addPrivilege({
      name: 'Cine',
      description: '',
      points: 30,
      unlocked: false,
      familyId: 'F1',
    })

    expect(m.addDoc.mock.calls[0][1]).toMatchObject({ familyId: 'F1' })
  })
})
