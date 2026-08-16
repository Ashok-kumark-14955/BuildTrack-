import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ─── Dev proxy targets ────────────────────────────────────────────────────────
// LOCAL_FUNCTION: run `node index.js` in functions/construction-api on port 4001
// REMOTE_FUNCTION: the deployed Catalyst Functions URL (no AppSail needed)
const LOCAL_FUNCTION = 'http://localhost:4001';
const REMOTE_FUNCTION =
  'https://project-rainfall-60081725173.development.catalystserverless.in/server/construction-api';

// Set VITE_BACKEND=remote to proxy to the deployed Function instead of local.
const BACKEND_TARGET =
  process.env.VITE_BACKEND === 'remote' ? REMOTE_FUNCTION : LOCAL_FUNCTION;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
