import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Dev: forward the relative "/api" calls to the local Postgres backend so the
    // app works same-origin without CORS. In production, put a reverse proxy in
    // front that maps /api → the API port (see docs/ADMIN_SETUP.md).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
