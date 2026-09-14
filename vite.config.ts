import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Test configuration lives in vitest.config.ts.
export default defineConfig({
  plugins: [react()],
})
