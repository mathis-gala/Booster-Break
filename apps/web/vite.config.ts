import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import path from 'node:path'

const devFoilLabPlugin = (): Plugin => ({
  name: 'dev-foil-lab',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const [pathname, query] = request.url?.split('?', 2) ?? []
      if (pathname?.endsWith('/dev/foils/')) {
        response.statusCode = 307
        response.setHeader('Location', `${pathname.slice(0, -1)}${query ? `?${query}` : ''}`)
        response.end()
        return
      }
      if (pathname?.endsWith('/dev/foils')) {
        request.url = `${pathname}.html${query ? `?${query}` : ''}`
      }
      next()
    })
  },
})

const excludeDevModulesPlugin = (): Plugin => ({
  name: 'exclude-dev-modules',
  apply: 'build',
  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (
        output.type === 'chunk' &&
        Object.keys(output.modules).some((moduleId) => moduleId.includes('/src/dev/'))
      ) {
        this.error('Development-only modules were included in the production bundle')
      }
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['localStorage', 'baseLocale'],
      emitTsDeclarations: true,
    }),
    react(),
    tailwindcss(),
    devFoilLabPlugin(),
    excludeDevModulesPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
