import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.JPG', '**/*.jpg', '**/*.jpeg', '**/*.PNG', '**/*.png', '**/*.gif', '**/*.svg', '**/*.webp'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  define: {
    // Глобальные определения для Node.js API
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})


