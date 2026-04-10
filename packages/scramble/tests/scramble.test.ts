import { expect, test } from 'vite-plus/test';
import { getScramble } from '../src/scramble.js';
import { getWcaEvents } from '../src/wca-events.js';

const events = getWcaEvents();

test.each(events)('getScramble returns a non-empty string for WCA event $id', (event) => {
  const scramble = getScramble(event.id);
  expect(typeof scramble).toBe('string');
  expect(scramble.length).toBeGreaterThan(0);
});

test('getScramble explicit length overrides the WCA default', () => {
  // 555 defaults to length 60. Requesting length 5 should yield a much shorter string.
  const short = getScramble('555', 5);
  const full = getScramble('555');
  // 5-token scramble is at most ~30 chars; a length-60 scramble is far longer.
  expect(short.length).toBeLessThan(full.length);
});

test('getScramble forwards non-WCA types through the escape hatch', () => {
  // `f2l` is a known cstimer training type, not a WCA event.
  // We only assert that the call does not throw and returns a string.
  const scramble = getScramble('f2l');
  expect(typeof scramble).toBe('string');
  expect(scramble.length).toBeGreaterThan(0);
});

test('getScramble throws a prefixed error for unknown types', () => {
  expect(() => getScramble('definitely-not-a-real-type-xyz')).toThrow(/@cubekit\/scramble/);
});

test("getScramble('333oh') uses the same underlying algorithm as getScramble('333')", () => {
  // Both should map to cstimer type '333'. With the same seed they produce the same output.
  // (Reproducibility check; the seed test file verifies the mechanism separately.)
  const evOh = events.find((e) => e.id === '333oh');
  const ev333 = events.find((e) => e.id === '333');
  expect(evOh?.cstimerType).toBe(ev333?.cstimerType);
});
