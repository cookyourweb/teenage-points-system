import { defineConfig } from 'vitest/config'

// Tests de las reglas de Firestore: corren contra el emulador, no contra jsdom.
// Sin setupFiles (no hace falta React) y sin paralelismo: hay un solo emulador
// compartido y los ficheros se pisarían los datos entre sí.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.rules.test.ts'],
    fileParallelism: false,
  },
})
