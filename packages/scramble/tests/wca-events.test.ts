import { expect, test } from 'vite-plus/test';
import { getWcaEvents, WCA_EVENTS, WCA_EVENT_BY_ID, type WcaEventId } from '../src/wca-events.js';

test('WCA_EVENTS has exactly 17 entries (all WCA events as of 2026)', () => {
  expect(WCA_EVENTS.length).toBe(17);
});

test('every WCA_EVENTS entry has a unique id', () => {
  const ids = WCA_EVENTS.map((e) => e.id);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});

test('every WCA_EVENTS entry has non-empty label and cstimerType', () => {
  for (const event of WCA_EVENTS) {
    expect(event.label.length).toBeGreaterThan(0);
    expect(event.cstimerType.length).toBeGreaterThan(0);
  }
});

test('every WCA_EVENTS entry has a non-negative integer length', () => {
  for (const event of WCA_EVENTS) {
    expect(event.length).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(event.length)).toBe(true);
  }
});

test("'333' and '333oh' share the same cstimerType", () => {
  const e333 = WCA_EVENT_BY_ID['333'];
  const e333oh = WCA_EVENT_BY_ID['333oh'];
  expect(e333.cstimerType).toBe(e333oh.cstimerType);
  expect(e333.cstimerType).toBe('333');
});

test('WCA_EVENT_BY_ID is consistent with WCA_EVENTS', () => {
  for (const event of WCA_EVENTS) {
    expect(WCA_EVENT_BY_ID[event.id]).toBe(event);
  }
});

test('getWcaEvents returns the same reference across calls', () => {
  expect(getWcaEvents()).toBe(getWcaEvents());
  expect(getWcaEvents()).toBe(WCA_EVENTS);
});

test('5x5/6x6/7x7/Megaminx/Pyraminx/4BLD/5BLD/MBLD have the expected WCA lengths', () => {
  // Spot-check the magic numbers from cstimer_module README against the table.
  expect(WCA_EVENT_BY_ID['555'].length).toBe(60);
  expect(WCA_EVENT_BY_ID['666'].length).toBe(80);
  expect(WCA_EVENT_BY_ID['777'].length).toBe(100);
  expect(WCA_EVENT_BY_ID['minx'].length).toBe(70);
  expect(WCA_EVENT_BY_ID['pyram'].length).toBe(10);
  expect(WCA_EVENT_BY_ID['444bld'].length).toBe(40);
  expect(WCA_EVENT_BY_ID['555bld'].length).toBe(60);
  expect(WCA_EVENT_BY_ID['333mbld'].length).toBe(5);
});

test('WCA_EVENTS covers all WcaEventId union members (compile-time enforced, runtime double-check)', () => {
  const expected: readonly WcaEventId[] = [
    '333',
    '222',
    '444',
    '555',
    '666',
    '777',
    '333bld',
    '333fm',
    '333oh',
    'clock',
    'minx',
    'pyram',
    'skewb',
    'sq1',
    '444bld',
    '555bld',
    '333mbld',
  ];
  const actual = WCA_EVENTS.map((e) => e.id).sort();
  expect(actual).toEqual([...expected].sort());
});
