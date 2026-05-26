import { describe, expect, it } from 'vitest';
import { createSvgDownloadName } from './download';

describe('createSvgDownloadName', () => {
  it('includes event id and one-based index', () => {
    expect(createSvgDownloadName({ eventId: '333', index: 0 })).toBe('cubekit-333-1.svg');
  });
});
