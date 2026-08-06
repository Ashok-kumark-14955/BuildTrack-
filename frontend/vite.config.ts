import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const REMOTE_BACKEND = 'https://construction-backend-50044693287.development.catalystappsail.in';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: REMOTE_BACKEND,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: REMOTE_BACKEND,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
