import { describe, expect, it } from 'vitest';
import { getEventLabel, getEventShortLabel } from './event-labels';

describe('event labels', () => {
  it('uses ASCII x for cube dimension labels', () => {
    expect(getEventLabel('333', 'en-US')).toBe('3x3x3');
    expect(getEventShortLabel('333mbld')).toBe('3x3x3 MBLD');
  });

  it('names Chinese multi-blind without the extra suffix', () => {
    expect(getEventLabel('333mbld', 'zh-CN')).toBe('三阶多盲');
  });

  it('names Face-Turning Octahedron events', () => {
    expect(getEventLabel('fto', 'en-US')).toBe('Face-Turning Octahedron');
    expect(getEventShortLabel('fto')).toBe('FTO');
  });
});
