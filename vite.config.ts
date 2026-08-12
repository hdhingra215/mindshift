import { defineConfig } from 'vitest/config'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must precede the React plugin so generated route modules are transformed.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  /*
   * Two suites, one runner.
   *
   *   tests/unit         pure TypeScript logic. Always runs, no network.
   *   tests/integration  the gameplay harness. Hits the linked Supabase project
   *                      and skips itself — loudly, with a stated reason — when
   *                      that project is unreachable or credentials are absent.
   *
   * The progression economy lives in SQL, so the integration suite is the only
   * place it can be covered at all; mocking the award functions would assert
   * that the mocks work. Skipping rather than failing is deliberate: a suite
   * that goes red because infrastructure is paused trains people to ignore red.
   */
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // A live round trip through Postgres is slower than the 5s default.
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
})
