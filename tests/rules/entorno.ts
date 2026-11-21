import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'

// Proyecto `demo-*`: el emulador no toca nada real.
export const PROYECTO = 'demo-teenage-points'

export function crearEntorno(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8085,
    },
  })
}

// Escribe sin pasar por las reglas: es el estado de partida del test.
export async function sembrar(
  env: RulesTestEnvironment,
  ruta: string,
  datos: object,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (contexto) => {
    await setDoc(doc(contexto.firestore(), ruta), datos)
  })
}

// Un cliente autenticado como `uid` con email y contraseña, con las reglas en
// marcha. Firebase siempre pone el proveedor en el token; aquí también.
export function como(env: RulesTestEnvironment, uid: string) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore()
}

// Un cliente con cuenta anónima: token válido, pero sin identificar a nadie.
export function comoAnonima(env: RulesTestEnvironment, uid: string) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()
}
