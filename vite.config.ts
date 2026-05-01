import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const REACT_COMPILER_PLUGIN = 'babel-plugin-react-compiler'

const config = defineConfig(({ mode }) => {
  const reactCompilerEnabled =
    mode === 'production' || process.env.BRILION_REACT_COMPILER === '1'

  return ({
  plugins: [
    // Only load devtools overlay in development
    mode === 'development' && devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['url', 'baseLocale'],
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(
      reactCompilerEnabled
        ? {
            babel: {
              plugins: [REACT_COMPILER_PLUGIN],
            },
          }
        : {},
    ),
  ].filter(Boolean),

  server: {
    watch: {
      // Don't watch unrelated directories — prevents CPU thrash
      ignored: [
        '**/openclaw/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/.output/**',
        '**/.nitro/**',
        '**/.tanstack/**',
        '**/.vinxi/**',
        '**/uploads/**',
        '**/dist/**',
        '**/content/**',
        '**/docs/**',
        '**/messages/**',
        '**/scripts/**',
        '**/public/**',
      ],
    },
  },

  optimizeDeps: {
    // Pre-bundle common browser deps for faster cold starts
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'zod',
      'lucide-react',
      'framer-motion',
    ],
    exclude: [
      // Server-only / native deps — never bundle for browser
      '@whiskeysockets/baileys',
      'grammy',
      'qrcode',
      'sharp',
      'pino',
      'ioredis',
      'bullmq',
    ],
  },

  build: {
    // Raise chunk size warning threshold slightly; Baileys etc are server-side only
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        '@whiskeysockets/baileys',
        'grammy',
        'sharp',
        'pino',
        'ioredis',
        'bullmq',
      ],
    },
  },
})
})

export default config
