import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
      '/images': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
}) 