import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    entry: {
      index: 'src/index.ts',
      'test-support/index': 'src/test-support/index.ts',
    },
    exports: true,
  }),
});
