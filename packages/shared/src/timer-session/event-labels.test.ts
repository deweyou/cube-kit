import { describe, expect, it } from 'vitest';
import { getWcaEventLabel, getWcaEventShortLabel } from './event-labels';

describe('event labels', () => {
  it('uses ASCII x for cube dimension labels', () => {
    expect(getWcaEventLabel('333', 'en-US')).toBe('3x3x3');
    expect(getWcaEventShortLabel('333mbld')).toBe('3x3x3 MBLD');
  });

  it('names Chinese multi-blind without the extra suffix', () => {
    expect(getWcaEventLabel('333mbld', 'zh-CN')).toBe('三阶多盲');
  });
});
