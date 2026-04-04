import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 60,
        lines: 70,
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
