import { afterEach, describe, expect, it } from 'vitest';
import {
  readSolverAssistMethod,
  readSolverAssistTargetOrder,
  writeSolverAssistMethod,
  writeSolverAssistTargetOrder,
} from './solver-assist-preferences';

afterEach(() => {
  localStorage.clear();
});

describe('solver assist method preferences', () => {
  it('remembers the selected method independently for each event', () => {
    writeSolverAssistMethod('333', 'cfop-f2l');
    writeSolverAssistMethod('333oh', 'roux-s2');
    writeSolverAssistMethod('333fm', 'eo-dr');

    expect(readSolverAssistMethod('333')).toBe('cfop-f2l');
    expect(readSolverAssistMethod('333oh')).toBe('roux-s2');
    expect(readSolverAssistMethod('333fm')).toBe('eo-dr');
  });

  it('falls back to the event default for corrupt or unsupported stored methods', () => {
    localStorage.setItem(
      'cubegin-solver-assist-methods',
      JSON.stringify({ '333': 'eo-dr', sq1: 'not-a-method' }),
    );

    expect(readSolverAssistMethod('333')).toBe('cross');
    expect(readSolverAssistMethod('sq1')).toBe('sq1-shape-ftm');
  });
});

describe('solver assist target order preferences', () => {
  it('remembers a normalized target order independently for each method', () => {
    writeSolverAssistTargetOrder('cross', ['U', 'D', 'U', '']);
    writeSolverAssistTargetOrder('roux-s1', ['RU', 'LU']);

    expect(readSolverAssistTargetOrder('cross')).toEqual(['U', 'D']);
    expect(readSolverAssistTargetOrder('roux-s1')).toEqual(['RU', 'LU']);
  });

  it('ignores corrupt stored target orders', () => {
    localStorage.setItem(
      'cubegin-solver-assist-target-orders',
      JSON.stringify({
        cross: ['B', 42, 'F', 'B'],
        'roux-s1': 'RU',
      }),
    );

    expect(readSolverAssistTargetOrder('cross')).toEqual(['B', 'F']);
    expect(readSolverAssistTargetOrder('roux-s1')).toEqual([]);
  });
});
