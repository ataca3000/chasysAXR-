import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // cámbialo por react o svelte si aplica
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  optimizeDeps: {
    exclude: ['server.ts'], // evita que Vite intente procesarlo
  },
})
