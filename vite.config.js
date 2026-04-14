import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace YOUR_GITHUB_USERNAME and kit-app with your actual GitHub username and repo name
export default defineConfig({
  plugins: [react()],
  base: '/kit-app/',
})
