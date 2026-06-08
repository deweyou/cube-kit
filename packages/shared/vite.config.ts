import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    dts: {},
    entry: {
      'wca/index': 'src/wca/index.ts',
      'timer/index': 'src/timer/index.ts',
      'timer-session/index': 'src/timer-session/index.ts',
    },
    exports: true,
  }),
});
