import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId } from './client-id';

const originalCrypto = globalThis.crypto;
const clientIdPattern = /^[0-9a-z]{8}-[0-9a-f]{16}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createClientId', () => {
  it('uses a fixed-length timestamp and random token shape', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1);
        return bytes;
      },
    });

    expect(createClientId(1700000000000)).toBe('loyw3v28-0101010101010101');
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(1);
        return bytes;
      },
    });

    const id = createClientId(1700000000000);

    expect(id).toHaveLength(25);
    expect(id).toMatch(clientIdPattern);
    expect(id.endsWith('-0101010101010101')).toBe(true);
  });

  it('falls back to a fixed-length id when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    const firstId = createClientId(1700000000000);
    const secondId = createClientId(1700000000000);

    expect(firstId).toHaveLength(25);
    expect(firstId).toMatch(clientIdPattern);
    expect(secondId).toHaveLength(25);
    expect(secondId).toMatch(clientIdPattern);
    expect(secondId).not.toBe(firstId);
  });

  it('restores the original crypto object after tests', () => {
    expect(originalCrypto).toBeDefined();
  });
});
