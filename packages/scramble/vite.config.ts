import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';

export default defineConfig({
  pack: definePackConfig({
    // cstimer_module is a devDependency and must be inlined into the bundle so
    // consumers don't need to declare it themselves. It carries the bulk of
    // this package's weight (~400 KB uncompressed, ~110 KB gzip) — see
    // `research.md` R7 for the tradeoff.
    deps: {
      alwaysBundle: ['cstimer_module'],
    },
    dts: {},
    exports: true,
    // Split cstimer_module into its own output chunk so our wrapper code
    // (~a few KB) stays a tiny file. Consumers still pay the full cstimer
    // weight when they import the package, but the two chunks cache
    // independently — if we bump our wrapper version, consumers don't
    // re-download cstimer itself.
    outputOptions: {
      codeSplitting: {
        groups: [
          {
            name: 'cstimer',
            test: /[\\/]cstimer_module[\\/]/,
          },
        ],
      },
    },
  }),
});
