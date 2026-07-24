import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nm = (pkg: string) => path.resolve(__dirname, 'node_modules', pkg);

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Workaround: rolldown (vite 8) strictly enforces package exports conditions for CSS
    // files. @deweyou-design packages expose CSS via paths not listed in exports, so we
    // alias each logical specifier to its physical path inside node_modules.
    alias: {
      '@deweyou-design/styles/reset.css': nm('@deweyou-design/styles/css/reset.css'),
      '@deweyou-design/styles/color.css': nm('@deweyou-design/styles/css/color.css'),
      '@deweyou-design/styles/theme.css': nm('@deweyou-design/styles/css/theme.css'),
      '@deweyou-design/styles/theme-dark.css': nm('@deweyou-design/styles/css/theme-dark.css'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 4488,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    server: {
      deps: {
        inline: [/@deweyou-design\/react/u],
      },
    },
  },
});
