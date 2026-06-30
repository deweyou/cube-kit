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
    exports: true,
  }),
  resolve: {
    alias: {
      '@cubegin/scramble-core': workspacePackage('scramble-core'),
      '@cubegin/scramble-image': workspacePackage('scramble-image'),
      '@cubegin/scramble-puzzle': workspacePackage('scramble-puzzle'),
      '@cubegin/shared/events': path.resolve(
        __dirname,
        '../../packages/shared/src/events/index.ts',
      ),
      '@cubegin/solver': workspacePackage('solver'),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
