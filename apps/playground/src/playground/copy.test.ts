import { describe, expect, it, vi } from 'vitest';
import { writeScramblesToClipboard } from './copy';

describe('writeScramblesToClipboard', () => {
  it('formats numbered scrambles for copying', async () => {
    const writeText = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await writeScramblesToClipboard(
      [
        { id: '333-1', eventId: '333', scramble: 'R U' },
        { id: '333-2', eventId: '333', scramble: 'F2' },
      ],
      { writeText },
    );

    expect(writeText).toHaveBeenCalledWith('1. R U\n2. F2');
  });
});
