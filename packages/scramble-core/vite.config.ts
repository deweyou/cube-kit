import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
      '@cubegin/scramble-puzzle': workspacePackage('scramble-puzzle'),
      '@cubegin/shared/timer': path.resolve(__dirname, '../../packages/shared/src/timer/index.ts'),
      '@cubegin/shared/timer-session': path.resolve(
        __dirname,
        '../../packages/shared/src/timer-session/index.ts',
      ),
      '@cubegin/shared/events': path.resolve(
        __dirname,
        '../../packages/shared/src/events/index.ts',
      ),
      '@cubegin/shared': workspacePackage('shared'),
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
