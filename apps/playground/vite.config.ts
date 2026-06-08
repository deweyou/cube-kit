import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspacePackage = (packagePath: string) =>
  path.resolve(__dirname, '../../packages', packagePath, 'src/index.ts');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cubegin/scramble-core': workspacePackage('scramble-core'),
      '@cubegin/event-icons': workspacePackage('event-icons'),
      '@cubegin/scramble-image': workspacePackage('scramble-image'),
      '@cubegin/scramble-puzzle': workspacePackage('scramble-puzzle'),
      '@cubegin/shared/wca': workspacePackage('shared/wca'),
      '@cubegin/solver': workspacePackage('solver'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
