import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'], // SOLO buffer (para xlsx-js-style)
      globals: {
        Buffer: true,
        global: false,
        process: false
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Sistema Ferretería POS',
        short_name: 'Ferretería',
        description: 'Punto de Venta para Ferretería (Offline First)',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3000000, // Aumentado a 3MB ya que el js bundle a veces supera 500kb
        navigateFallback: '/index.html', // ★ Ruteo Offline PWA SPA
        navigateFallbackAllowlist: [/^\/.*$/] // Interceptar cualquier ruta para volverla local-first
      }
    })
  ],
  optimizeDeps: {
    exclude: ['@powersync/web', '@journeyapps/wa-sqlite']
  },
  worker: {
    format: 'es',
    plugins: () => []
  },
  build: {
    target: 'esnext',
    // ★ CACHE BUSTING: Nombres únicos por build para que Chrome no sirva chunks obsoletos
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
          'pdf-tools': ['jspdf', 'jspdf-autotable', 'react-to-print'],
          'excel-tools': ['xlsx-js-style'],
          'ui-tools': ['lucide-react', 'sonner', 'react-signature-canvas']
        }
      }
    },
    // ★ SEGURIDAD: Eliminar console.* en builds de producción
    // En desarrollo (npm run dev) se mantienen para debugging
    ...(mode === 'production' && {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,      // Elimina console.log, console.warn, etc.
          drop_debugger: true,     // Elimina debugger statements
          pure_funcs: ['console.log', 'console.warn', 'console.info']
        }
      }
    })
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  }
}))
