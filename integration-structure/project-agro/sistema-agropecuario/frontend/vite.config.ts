import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/


export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
    // Proxy API calls for local development.
    // - When running locally: Uses localhost:8001 (backend container mapped to host port 8001)
    // - When running in Docker Compose: VITE_API_BASE='/api/' is set (see docker-compose.yml),
    //   which bypasses this proxy entirely and makes direct requests to the backend service
    // - For custom backend URLs: Set VITE_API_BASE to override (e.g., 'http://localhost:8001/api/')
    proxy: {
      '/api': {
        target: (() => {
          const defaultTarget = 'http://localhost:8000';
          const dockerBackendTarget = 'http://backend:8000';
          const env = process.env.VITE_API_BASE;
          if (env && /^https?:\/\//.test(env)) {
            try { return new URL(env).origin; } catch { return defaultTarget; }
          }
          if (env && env.startsWith('/')) return dockerBackendTarget;
          return defaultTarget;
        })(),
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: (() => {
          const env = process.env.VITE_API_BASE;
          if (env && env.startsWith('/')) return 'ws://backend:8000';
          return 'ws://localhost:8000';
        })(),
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    }
  }
})