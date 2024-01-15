
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig(
{
  server: {
    proxy: {
      // with options
      '/backend': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '/'),
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        test: resolve(__dirname, 'test/test.html'),
      },
    },
  }
})