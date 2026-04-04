import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 75,
      },
      exclude: [
        'scripts/**',
        '**/dist/**',
        '**/dist-testing/**',
        'docs/**',
        'examples/**',
        'test/e2e/**',
      ],
    },
    setupFiles: ['test/setup.ts'],
    include: [
      'packages/**/test/**/*.test.ts',
      'test/e2e/**/*.test.ts',
    ],
  },
});
