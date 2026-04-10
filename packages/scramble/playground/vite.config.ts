import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const playgroundRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: playgroundRoot,
  server: {
    port: 5180,
  },
});
