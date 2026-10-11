import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createStudyHelperRouter } from './api/study-helper-router.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const router = createStudyHelperRouter(env.GEMINI_API_KEY)

  return {
    plugins: [
      react(),
      {
        name: 'study-helper-api',
        configureServer(server) {
          server.middlewares.use('/api', router)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api', router)
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
  }
})
