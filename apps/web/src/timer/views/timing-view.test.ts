import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TimingView layout CSS', () => {
  it('keeps the running timer visually above center like the result view', () => {
    const timingViewCss = readFileSync(
      resolve(process.cwd(), 'src/timer/views/timing-view.module.css'),
      'utf8',
    );

    expect(timingViewCss).toContain('transform: translateY(clamp(-72px, -8vh, -32px));');
  });
});
