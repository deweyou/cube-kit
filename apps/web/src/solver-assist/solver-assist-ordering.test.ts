import type { PuzzleAssistSolution } from '@cubegin/solver';
import { describe, expect, it } from 'vitest';
import { orderSolverAssistSolutions } from './solver-assist-ordering';

const createSolution = (target: string): PuzzleAssistSolution => ({
  method: 'cross',
  target,
  targetLabel: target,
  setupRotation: '',
  solution: 'R U',
  depth: 2,
  metric: { ftm: 2, qtm: 2 },
});

describe('orderSolverAssistSolutions', () => {
  it('uses the saved target order and appends newly supported targets in solver order', () => {
    const solutions = ['D', 'U', 'L', 'R'].map(createSolution);

    expect(
      orderSolverAssistSolutions(solutions, ['R', 'D', 'unknown']).map(
        (solution) => solution.target,
      ),
    ).toEqual(['R', 'D', 'U', 'L']);
    expect(solutions.map((solution) => solution.target)).toEqual(['D', 'U', 'L', 'R']);
  });

  it('keeps duplicate and unranked targets stable', () => {
    const solutions = ['D', 'U', 'D', 'L'].map(createSolution);

    expect(orderSolverAssistSolutions(solutions, ['U']).map((solution) => solution.target)).toEqual(
      ['U', 'D', 'D', 'L'],
    );
  });
});
