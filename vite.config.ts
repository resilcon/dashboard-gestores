import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Publicado em https://resilcon.github.io/dashboard-gestores/ (GitHub Pages
  // de projeto, não de usuário) -- precisa do path base no build de produção;
  // em dev (`npm run dev`) fica em "/" mesmo, sem esse prefixo.
  base: command === 'build' ? '/dashboard-gestores/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
