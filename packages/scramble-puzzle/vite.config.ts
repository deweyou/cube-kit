import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    entry: {
      index: 'src/index.ts',
      'test-support/index': 'src/test-support/index.ts',
    },
    exports: true,
  }),
  resolve: {
    alias: {
      '@cubegin/shared/wca': path.resolve(__dirname, '../../packages/shared/src/wca/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-support/**'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
