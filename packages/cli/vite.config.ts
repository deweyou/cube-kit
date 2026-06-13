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
      '@cubegin/solver': workspacePackage('solver'),
    },
  },
});
