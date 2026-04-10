import { expect, test } from 'vite-plus/test';
import { getScramble } from '../src/scramble.js';
import { setSeed } from '../src/seed.js';

test('setSeed makes scramble generation deterministic', () => {
  setSeed('cubekit-seed-test');
  const a = getScramble('333');

  setSeed('cubekit-seed-test');
  const b = getScramble('333');

  expect(a).toBe(b);
});

test('different seeds produce different scrambles', () => {
  setSeed('cubekit-seed-1');
  const a = getScramble('333');

  setSeed('cubekit-seed-2');
  const b = getScramble('333');

  // With overwhelming probability these are different — false-positive rate is ~1 / 20! for 3x3.
  expect(a).not.toBe(b);
});
