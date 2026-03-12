import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
    '/teacher': {
            target: 'http://localhost:8080',
            changeOrigin: true,
            // No rewrite needed if the backend expects /teacher
          },
    '/ws': {
            target: 'ws://localhost:8080',
            changeOrigin: true,
            ws: true
          }
    }
  }
})
