import { describe, expect, it } from 'vitest';

import { listSolverEvents, listSolverMethods, runSolverAssist } from './solver.js';

describe('solver handlers', () => {
  it('lists supported assist events', () => {
    expect(listSolverEvents()).toEqual({
      events: [
        {
          id: '333',
          methods: [
            'cross',
            'xcross',
            'eoline',
            'eofc',
            'roux-s1',
            'roux-s2',
            'petrus-s1',
            'petrus-s2',
            'cfop-f2l',
            'zz-f2l',
            'block-222',
            'eo-dr',
            '333-two-phase',
            '333-general',
          ],
        },
        { id: '222', methods: ['222-face', '222-layer'] },
        { id: 'sq1', methods: ['sq1-shape-ftm', 'sq1-shape-twist'] },
        { id: 'pyram', methods: ['pyraminx-v'] },
        { id: 'skewb', methods: ['skewb-face'] },
      ],
    });
  });

  it('lists methods for one assist event', () => {
    expect(listSolverMethods('333')).toEqual({
      eventId: '333',
      methods: [
        'cross',
        'xcross',
        'eoline',
        'eofc',
        'roux-s1',
        'roux-s2',
        'petrus-s1',
        'petrus-s2',
        'cfop-f2l',
        'zz-f2l',
        'block-222',
        'eo-dr',
        '333-two-phase',
        '333-general',
      ],
    });
  });

  it('defaults assist to all methods for the requested event', () => {
    expect(runSolverAssist('skewb', 'R U', [])).toMatchObject({
      eventId: 'skewb',
      results: [{ method: 'skewb-face' }],
    });
  });

  it('rejects unknown solver events with an agent hint', () => {
    expect(() => listSolverMethods('777x')).toThrow(
      expect.objectContaining({
        code: 'UNKNOWN_SOLVER_EVENT',
        exitCode: 3,
        hints: ['Run `cubegin solver events --json`.'],
      }),
    );
  });

  it('rejects methods that are not supported by the event', () => {
    expect(() => runSolverAssist('222', 'R U', ['cross'])).toThrow(
      expect.objectContaining({
        code: 'UNKNOWN_SOLVER_METHOD',
        exitCode: 3,
        hints: ['Run `cubegin solver methods 222 --json`.'],
      }),
    );
  });
});
