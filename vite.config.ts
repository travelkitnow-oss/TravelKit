import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En desarrollo, sirve la API de datos (/api/*) desde el mismo servidor de Vite,
 * usando el mismo código que las funciones de Vercel en producción.
 */
function devApi(): Plugin {
  return {
    name: 'travelkit-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const { routeApi } = await server.ssrLoadModule('/server/http.ts')
          const handled = await routeApi(req, res)
          if (!handled) next()
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Variables sin prefijo VITE_ (como DATABASE_URL) solo para el servidor, nunca para el navegador
  const env = loadEnv(mode, process.cwd(), '')
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL

  return {
    plugins: [react(), devApi()],
    define: {
      global: 'window',
    },
    server: {
      port: 3000,
    },
    build: {
      chunkSizeWarningLimit: 3000,
    }
  }
})
