import { expect, test } from 'vite-plus/test';
import { getImage } from '../src/image.js';
import { getScramble } from '../src/scramble.js';
import { getWcaEvents } from '../src/wca-events.js';

const events = getWcaEvents();

test.each(events)('getImage returns an SVG for WCA event $id', (event) => {
  const scramble = getScramble(event.id);
  const svg = getImage(scramble, event.id);
  expect(typeof svg).toBe('string');
  expect(svg).toContain('<svg');
  expect(svg).toContain('</svg>');
});

test.each(events)(
  'getImage injects a viewBox so the SVG scales without clipping for $id',
  (event) => {
    const svg = getImage(getScramble(event.id), event.id);
    // Regression guard for the "7x7 cube unfolded net gets clipped at CSS resize"
    // bug: cstimer_module emits SVG without a viewBox, so responsive CSS scaling
    // truncates everything outside the natural pixel box. getImage must inject
    // one derived from the upstream width/height attributes.
    const viewBoxMatch = svg.match(/\bviewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
    expect(viewBoxMatch).not.toBeNull();

    const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    const heightMatch = svg.match(/\bheight="(\d+(?:\.\d+)?)"/);
    // viewBox dimensions must match the SVG's declared width/height exactly —
    // otherwise the injected viewBox would distort the aspect ratio.
    expect(viewBoxMatch?.[1]).toBe(widthMatch?.[1]);
    expect(viewBoxMatch?.[2]).toBe(heightMatch?.[1]);
  },
);

test('getImage does not duplicate a viewBox if the upstream already supplied one', () => {
  // Defensive: if cstimer_module ever starts emitting its own viewBox, our
  // injection must become a no-op instead of producing `viewBox="..." viewBox="..."`.
  const svg = getImage(getScramble('333'), '333');
  const viewBoxOccurrences = svg.match(/\bviewBox=/g) ?? [];
  expect(viewBoxOccurrences.length).toBe(1);
});

test('getImage returns an SVG for an empty scramble (solved state)', () => {
  const svg = getImage('', '333');
  expect(typeof svg).toBe('string');
  expect(svg.length).toBeGreaterThan(0);
  expect(svg).toContain('<svg');
});

test('getImage throws a prefixed error for unknown types', () => {
  expect(() => getImage('R U', 'definitely-not-a-real-type-xyz')).toThrow(/@cubekit\/scramble/);
});
