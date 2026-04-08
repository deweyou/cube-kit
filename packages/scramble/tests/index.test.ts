import { expect, test, vi } from 'vite-plus/test';
import { scrambleText, scramble, createScrambler } from '../src/index.js';

test('scrambleText resolves with the target text', async () => {
  const updates: string[] = [];
  await scrambleText('hello', { steps: 2, speed: 0 }, (t) => updates.push(t));

  const last = updates.at(-1);
  expect(last).toBe('hello');
});

test('scrambleText calls onUpdate on every frame', async () => {
  const updates: string[] = [];
  await scrambleText('hi', { steps: 3, speed: 0 }, (t) => updates.push(t));

  // At least one intermediate frame + the final resolved frame.
  expect(updates.length).toBeGreaterThan(1);
});

test('scrambleText preserves spaces without scrambling', async () => {
  const updates: string[] = [];
  await scrambleText('a b', { steps: 2, speed: 0 }, (t) => updates.push(t));

  // Every frame should keep the space in position 1.
  for (const frame of updates) {
    expect(frame[1]).toBe(' ');
  }
});

test('scramble sets element textContent and resolves', async () => {
  const el = { textContent: '' };
  await scramble(el, 'world', { steps: 2, speed: 0 });
  expect(el.textContent).toBe('world');
});

test('scramble is a no-op for null element', async () => {
  await expect(scramble(null, 'any')).resolves.toBeUndefined();
});

test('createScrambler returns a controller that plays text', async () => {
  const frames: string[] = [];
  const ctrl = createScrambler((t) => frames.push(t));

  await ctrl.play('abc', { steps: 2, speed: 0 });
  expect(frames.at(-1)).toBe('abc');
});
