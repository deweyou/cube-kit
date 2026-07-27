import { describe, expect, it } from 'vitest';
import { EVENT_IDS, EVENT_INFO } from '@cubegin/shared/events';
import {
  SCRAMBLE_TYPE_CATALOG,
  SCRAMBLE_TYPE_IDS,
  TRAINING_SCRAMBLE_TYPE_IDS,
  getScrambleTypeDefinition,
} from './catalog.js';

describe('scramble type catalog', () => {
  it('contains every official event and every accepted training type exactly once', () => {
    expect(TRAINING_SCRAMBLE_TYPE_IDS).toHaveLength(94);
    expect(SCRAMBLE_TYPE_IDS).toHaveLength(EVENT_IDS.length + 94);
    expect(new Set(SCRAMBLE_TYPE_IDS).size).toBe(SCRAMBLE_TYPE_IDS.length);
    expect(new Set(Object.keys(SCRAMBLE_TYPE_CATALOG))).toEqual(new Set(SCRAMBLE_TYPE_IDS));
  });

  it('keeps official event ids mapped to their existing puzzle metadata', () => {
    for (const eventId of EVENT_IDS) {
      expect(getScrambleTypeDefinition(eventId)).toMatchObject({
        id: eventId,
        baseEventId: eventId,
        puzzleId: EVENT_INFO[eventId].puzzleId,
        categoryId: 'official',
        kind: 'official',
      });
    }
  });

  it('limits holding orientation to explicit bottom-layer and complete-face training', () => {
    const orientedTypes = TRAINING_SCRAMBLE_TYPE_IDS.filter(
      (id) => getScrambleTypeDefinition(id).orientationTarget !== undefined,
    );

    expect(orientedTypes).toHaveLength(33);
    expect(orientedTypes.filter((id) => id.startsWith('222.'))).toHaveLength(9);
    expect(orientedTypes.filter((id) => id.startsWith('333.'))).toHaveLength(19);
    expect(orientedTypes.filter((id) => id.startsWith('444.'))).toHaveLength(4);
    expect(orientedTypes.filter((id) => id.startsWith('skewb.'))).toEqual(['skewb.l2l']);

    for (const unsupportedType of [
      '222.no_bar',
      '333.edges_only',
      '333.subset.ru',
      '444.edge_pairing',
      '555.edge_pairing',
      'skewb.no_bar',
    ] as const) {
      expect(getScrambleTypeDefinition(unsupportedType).orientationTarget).toBeUndefined();
    }
  });

  it.each([
    ['222.cll', '222', 'cube', '222', 'case-state', '222.cll', 'bottom-layer'],
    ['333.easy_cross', '333', 'cube', '333.cfop', 'random-state', undefined, 'bottom-layer'],
    ['333.subset.ru', '333', 'cube', '333.subset', 'subgroup', undefined, undefined],
    ['444.poll', '444', 'cube', '444', 'case-state', '444.poll', 'bottom-layer'],
    ['555.edge_pairing', '555', 'cube', 'big-cube', 'template', undefined, undefined],
    ['minx.lsll', 'minx', 'megaminx', 'minx', 'case-state', 'minx.lsll', undefined],
    ['pyram.no_bar', 'pyram', 'pyraminx', 'pyram', 'random-state', undefined, undefined],
    ['skewb.l2l', 'skewb', 'skewb', 'skewb', 'case-state', 'skewb.l2l', 'complete-face'],
    ['sq1.csp', 'sq1', 'square1', 'sq1', 'case-state', 'sq1.csp', undefined],
    [
      'fto.centers_only',
      'fto',
      'face-turning-octahedron',
      'fto',
      'random-state',
      undefined,
      undefined,
    ],
  ] as const)(
    'describes %s with stable routing metadata',
    (id, baseEventId, puzzleId, categoryId, generatorKind, caseSetId, orientationTarget) => {
      expect(getScrambleTypeDefinition(id)).toEqual({
        id,
        baseEventId,
        puzzleId,
        categoryId,
        kind: id.includes('.subset.') ? 'subset' : 'training',
        generatorKind,
        ...(caseSetId === undefined ? {} : { caseSetId }),
        ...(orientationTarget === undefined ? {} : { orientationTarget }),
      });
    },
  );

  it('throws a diagnostic error for unknown ids', () => {
    expect(() => getScrambleTypeDefinition('333.not-real')).toThrow(
      "@cubegin/scramble-core: unknown scramble type '333.not-real'",
    );
  });
});
