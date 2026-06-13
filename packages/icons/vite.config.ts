import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspacePackage = (packagePath: string) =>
  path.resolve(__dirname, '../../packages', packagePath, 'src/index.ts');

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    entry: {
      index: 'src/index.ts',
      'brand/index': 'src/brand/index.ts',
      'events/index': 'src/events/index.ts',
      'react/index': 'src/react/index.tsx',
    },
    exports: true,
  }),
  resolve: {
    alias: {
      '@cubegin/scramble-puzzle': workspacePackage('scramble-puzzle'),
      '@cubegin/shared/wca': path.resolve(__dirname, '../../packages/shared/src/wca/index.ts'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
