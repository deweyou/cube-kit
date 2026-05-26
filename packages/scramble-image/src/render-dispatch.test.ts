import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WcaEventId } from '@cubekit/scramble-puzzle';

describe('renderScrambleImage dispatch', () => {
  afterEach(() => {
    vi.doUnmock('@cubekit/scramble-puzzle');
    vi.resetModules();
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
