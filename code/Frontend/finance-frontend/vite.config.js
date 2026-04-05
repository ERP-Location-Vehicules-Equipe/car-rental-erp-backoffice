import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {

      // 🔐 AUTH SERVICE
      '/api': {
        target: 'http://auth_microservice:8000',
        changeOrigin: true,
      },

      // 💰 FINANCE SERVICE
      '/finance': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }

    }
  }
})