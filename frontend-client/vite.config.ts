import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'POLLLAR_', 'POLLAR_'],
  server: {
    // Allow specific domains or subdomains
    allowedHosts: [
      'nkzmg-135-237-130-225.run.pinggy-free.link'
    ],
  }
})
