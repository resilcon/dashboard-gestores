import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Config separada da do Vite (vite.config.ts) só porque lá o `base` muda
// conforme o `command` (build vs. dev) -- aqui não precisa disso, só do
// mesmo alias "@/" pros testes conseguirem importar igual ao app.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
