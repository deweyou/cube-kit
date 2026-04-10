import { expect, test } from 'vite-plus/test';
import * as scramblePkg from '../src/index.js';

test('public API surface exposes exactly the documented functions', () => {
  expect(typeof scramblePkg.getScramble).toBe('function');
  expect(typeof scramblePkg.getImage).toBe('function');
  expect(typeof scramblePkg.setSeed).toBe('function');
  expect(typeof scramblePkg.getWcaEvents).toBe('function');
});

test('public API exposes WCA_EVENTS and WCA_EVENT_BY_ID constants', () => {
  expect(Array.isArray(scramblePkg.WCA_EVENTS)).toBe(true);
  expect(scramblePkg.WCA_EVENTS.length).toBe(17);
  expect(typeof scramblePkg.WCA_EVENT_BY_ID).toBe('object');
});

test('full end-to-end sanity: generate + image for each WCA event via public entry', () => {
  for (const event of scramblePkg.getWcaEvents()) {
    const scr = scramblePkg.getScramble(event.id);
    const svg = scramblePkg.getImage(scr, event.id);
    expect(scr.length).toBeGreaterThan(0);
    expect(svg).toContain('<svg');
  }
});
