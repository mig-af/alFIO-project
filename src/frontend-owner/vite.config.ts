import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'POLLLAR_', 'POLLAR_'],
  server:{
    allowedHosts:[
      
      "3e767aae58e3d3c5-135-237-130-235.serveousercontent.com"
    ]
  }
})
