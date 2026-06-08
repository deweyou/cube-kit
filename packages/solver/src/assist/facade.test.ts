import { describe, expect, it } from 'vitest';
import { UnknownSolverMethodError, solvePuzzleAssist } from '../index.js';

describe('puzzle assist facade', () => {
  it('routes 2x2 helper methods through the generic facade', () => {
    const [result] = solvePuzzleAssist('222', ['222-face'], 'R U', { targets: ['D'] });

    expect(result.method).toBe('222-face');
    expect(result.solutions[0]?.target).toBe('D');
  });

  it('routes Square-1, Pyraminx, and Skewb helper methods through the generic facade', () => {
    const [sq1] = solvePuzzleAssist('sq1', ['sq1-shape-ftm'], '(3,0) /');
    const [pyram] = solvePuzzleAssist('pyram', ['pyraminx-v'], 'U R', { targets: ['D'] });
    const [skewb] = solvePuzzleAssist('skewb', ['skewb-face'], 'R U', { targets: ['D'] });

    expect(sq1.method).toBe('sq1-shape-ftm');
    expect(pyram.method).toBe('pyraminx-v');
    expect(skewb.method).toBe('skewb-face');
  });

  it('routes cstimer-style staged 3x3 helpers through the generic facade', () => {
    const [result, general] = solvePuzzleAssist('333', ['cfop-f2l', '333-general'], '');

    expect(result.method).toBe('cfop-f2l');
    expect(result.solutions.map((solution) => solution.targetLabel)).toEqual([
      'Cross',
      'F2L-1',
      'F2L-2',
      'F2L-3',
      'F2L-4',
    ]);
    expect(general.method).toBe('333-general');
    expect(general.solutions.map((solution) => solution.targetLabel)).toEqual(['Cross']);
  });

  it('rejects methods that do not belong to the selected event', () => {
    expect(() => solvePuzzleAssist('222', ['cross'], 'R U')).toThrow(UnknownSolverMethodError);
  });
});
