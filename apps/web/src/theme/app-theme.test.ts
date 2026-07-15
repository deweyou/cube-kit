import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string) => readFileSync(join(cwd(), relativePath), 'utf8');

describe('app theme overrides', () => {
  it('loads app theme overrides after the design system themes', () => {
    const mainSource = readSourceFile('src/main.tsx');

    expect(mainSource.indexOf('@deweyou-design/styles/theme-dark.css')).toBeLessThan(
      mainSource.indexOf('./theme/app-theme.css'),
    );
  });

  it('uses neutral black dark tokens instead of warm stone surfaces', () => {
    const themeSource = readSourceFile('src/theme/app-theme.css');

    expect(themeSource).toMatch(/\[data-theme='dark'\]\s*\{/u);
    expect(themeSource).toMatch(/--ui-color-canvas:\s*#080808;/u);
    expect(themeSource).toMatch(/--ui-color-surface:\s*#111111;/u);
    expect(themeSource).toMatch(/--ui-color-surface-raised:\s*#1b1b1b;/u);
    expect(themeSource).toMatch(/--ui-color-border:\s*#303030;/u);
    expect(themeSource).not.toMatch(/stone/u);
  });

  it('disables text selection across the app while retaining editable controls', () => {
    const themeSource = readSourceFile('src/theme/app-theme.css');

    expect(themeSource).toMatch(/\[data-theme\],\s*\[data-theme\] \*\s*\{[^}]*user-select:\s*none;/su);
    expect(themeSource).toMatch(
      /\[data-theme\] :is\(input, textarea, \[contenteditable='true'\]\)\s*\{[^}]*user-select:\s*text;/su,
    );
  });
});
