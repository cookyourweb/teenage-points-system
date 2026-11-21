import { defineConfig } from 'vitest/config'

// Test de integracion del script de baja de familia: corre contra los
// emuladores de Firestore y Auth (los levanta `firebase emulators:exec`) y un
// Mongo en memoria. Sin jsdom ni setupFiles: es codigo de Node.
// Los timeouts son largos porque la primera vez mongodb-memory-server descarga
// el binario de mongod, y sin paralelismo porque los emuladores son compartidos.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/integracion.test.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
})
