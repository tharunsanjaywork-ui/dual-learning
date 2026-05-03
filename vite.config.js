import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Fix "page not found" on reload during dev
    historyApiFallback: true,
  },
  preview: {
    port: 4173,
    // Fix "page not found" on reload during preview
    historyApiFallback: true,
  },
  build: {
    // Suppress chunk size warning for Firebase
    chunkSizeWarningLimit: 1000,
  },
})
