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
      '@cubekit/scramble-core': workspacePackage('scramble-core'),
      '@cubekit/scramble-image': workspacePackage('scramble-image'),
      '@cubekit/scramble-puzzle': workspacePackage('scramble-puzzle'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
