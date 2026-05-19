import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: [
      'unvocable-oligopoly-lorraine.ngrok-free.dev',
      ...(process.env.WOP_NGROK_DOMAIN ? [process.env.WOP_NGROK_DOMAIN] : []),
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://127.0.0.1:3333',
        ws: true,
        changeOrigin: true,
      },
    },
    hmr: {
        port: 5173,
        protocol: 'ws',
        host: 'localhost',
      },
    cors: true,
  },
  define: {
    'import.meta.env.DEV': process.env.NODE_ENV !== 'production',
  },
})
