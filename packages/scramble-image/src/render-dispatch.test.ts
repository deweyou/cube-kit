import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WcaEventId } from '@cubekit/scramble-puzzle';

describe('renderScrambleImage dispatch', () => {
  afterEach(() => {
    vi.doUnmock('@cubekit/scramble-puzzle');
    vi.resetModules();
  });

  it('keeps omitted options and net view identical', async () => {
    const { renderScrambleImage } = await import('./render.js');

    expect(renderScrambleImage('333', 'R U', { view: 'net' })).toBe(
      renderScrambleImage('333', 'R U'),
    );
  });

  it('renders supported cube events with a distinct isometric view', async () => {
    const { renderScrambleImage } = await import('./render.js');

    const net = renderScrambleImage('333', 'R U');
    const isometric = renderScrambleImage('333', 'R U', { view: 'isometric' });

    expect(isometric).not.toBe(net);
    expect(isometric).toContain('<path');
  });

  it('falls back to the existing Clock renderer for isometric view', async () => {
    const { renderScrambleImage } = await import('./render.js');
    const scramble = 'UR3+ DR2- DL0+ UL5- U1+ R2+ D3- L4+ ALL5+';

    expect(renderScrambleImage('clock', scramble, { view: 'isometric' })).toBe(
      renderScrambleImage('clock', scramble),
    );
  });

  it('falls back to the existing Square-1 renderer for isometric view', async () => {
    const { renderScrambleImage } = await import('./render.js');

    expect(renderScrambleImage('sq1', '(3,0) /', { view: 'isometric' })).toBe(
      renderScrambleImage('sq1', '(3,0) /'),
    );
  });

  it('rejects a known cube event when no cube net size is configured for it', async () => {
    vi.resetModules();
    vi.doMock('@cubekit/scramble-puzzle', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@cubekit/scramble-puzzle')>();

      return {
        ...actual,
        WCA_EVENT_INFO: {
          ...actual.WCA_EVENT_INFO,
          '999': { id: '999', label: 'Future Cube', puzzleId: 'cube' },
        },
      };
    });

    const { renderScrambleImage } = await import('./render.js');

    expect(() => renderScrambleImage('999' as WcaEventId, '')).toThrow(
      "@cubekit/scramble-image: event '999' is not renderable yet",
    );
  });
});
