import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspacePackage = (packagePath: string) =>
  path.resolve(__dirname, '../../packages', packagePath, 'src/index.ts');
const workspaceSource = (sourcePath: string) =>
  path.resolve(__dirname, '../../packages', sourcePath);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cubegin/scramble-core': workspacePackage('scramble-core'),
      '@cubegin/icons/brand': workspaceSource('icons/src/brand/index.ts'),
      '@cubegin/icons/events': workspaceSource('icons/src/events/index.ts'),
      '@cubegin/icons/react': workspaceSource('icons/src/react/index.tsx'),
      '@cubegin/icons': workspaceSource('icons/src/index.ts'),
      '@cubegin/scramble-image': workspacePackage('scramble-image'),
      '@cubegin/scramble-puzzle': workspacePackage('scramble-puzzle'),
      '@cubegin/shared/wca': workspaceSource('shared/src/wca/index.ts'),
      '@cubegin/solver': workspacePackage('solver'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
