import { defineConfig } from 'vite-plus';
import { defineConfig as definePackConfig } from 'vite-plus/pack';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PublicPackConfig {
  readonly alias?: Record<string, string>;
  readonly entry?: Record<string, string>;
  readonly root?: string;
}

const publicPackConfigPath = resolve(import.meta.dirname, '.build/public-pack.json');
const publicPackConfig: PublicPackConfig = existsSync(publicPackConfigPath)
  ? (JSON.parse(readFileSync(publicPackConfigPath, 'utf8')) as PublicPackConfig)
  : {};

export default defineConfig({
  pack: definePackConfig({
    alias: publicPackConfig.alias,
    dts: {},
    entry: publicPackConfig.entry,
    exports: true,
    root: publicPackConfig.root,
    unbundle: true,
  }),
  test: {
    include: ['src/**/*.test.ts'],
  },
});
