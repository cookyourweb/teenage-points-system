import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // Adding alias for src directory
    },
  },
  server: {
    port: 5173,
    // Si el 5173 esta ocupado, fallar en vez de saltar al 5174 sin avisar.
    //
    // El backend solo permite CORS desde el 5173: cuando Vite cambia de puerto por
    // su cuenta, la aplicacion carga bien y TODAS las llamadas a la API mueren en
    // la preflight con un 403 que el navegador reporta como error de red generico.
    // Se pierde media hora buscando un fallo de CORS que no existe.
    //
    // Es mejor no arrancar y leer el motivo.
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
})
