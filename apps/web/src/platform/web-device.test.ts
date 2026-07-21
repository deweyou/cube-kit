import { afterEach, describe, expect, it, vi } from 'vitest';
import { isMobileWebDevice } from './web-device';

const setNavigatorSignals = ({
  userAgent,
  maxTouchPoints = 0,
  userAgentDataMobile,
}: {
  userAgent: string;
  maxTouchPoints?: number;
  userAgentDataMobile?: boolean;
}) => {
  vi.stubGlobal('navigator', {
    userAgent,
    maxTouchPoints,
    userAgentData: userAgentDataMobile === undefined ? undefined : { mobile: userAgentDataMobile },
  });
};

describe('isMobileWebDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognizes mobile and tablet user agents', () => {
    setNavigatorSignals({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    expect(isMobileWebDevice()).toBe(true);

    setNavigatorSignals({
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36',
    });
    expect(isMobileWebDevice()).toBe(true);
  });

  it('recognizes iPadOS desktop-class user agents through feature detection', () => {
    setNavigatorSignals({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      maxTouchPoints: 5,
    });

    expect(isMobileWebDevice()).toBe(true);
  });

  it('uses UA client hints when the browser provides them', () => {
    setNavigatorSignals({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      userAgentDataMobile: true,
    });

    expect(isMobileWebDevice()).toBe(true);
  });

  it('keeps desktop browsers in desktop mode even in a narrow window', () => {
    setNavigatorSignals({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    });

    expect(isMobileWebDevice()).toBe(false);
  });
});
