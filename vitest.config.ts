import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    envFile: '.env.test',
    setupFiles: ['src/tests/setup.ts'],
    pool: 'forks',
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/services/**', 'src/controllers/**', 'src/routes/**'],
      exclude: ['src/database/generated/**', 'src/tests/**']
    }
  }
})
