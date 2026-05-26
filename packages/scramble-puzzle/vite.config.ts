import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    entry: {
      index: 'src/index.ts',
      'test-support/index': 'src/test-support/index.ts',
    },
    exports: true,
  }),
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-support/**'],
      thresholds: {
        statements: 97.21,
        branches: 93.57,
        functions: 99.42,
        lines: 98.34,
      },
    },
  },
});
