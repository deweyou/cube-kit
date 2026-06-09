import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

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
});
