import type { PuzzleAssistSolution } from '@cubegin/solver';

export const orderSolverAssistSolutions = (
  solutions: readonly PuzzleAssistSolution[],
  targetOrder: readonly string[],
): PuzzleAssistSolution[] => {
  const targetRanks = new Map(targetOrder.map((target, index) => [target, index]));

  return solutions
    .map((solution, solverIndex) => ({ solution, solverIndex }))
    .sort((left, right) => {
      const leftRank = targetRanks.get(left.solution.target);
      const rightRank = targetRanks.get(right.solution.target);

      if (leftRank === undefined && rightRank === undefined) {
        return left.solverIndex - right.solverIndex;
      }
      if (leftRank === undefined) return 1;
      if (rightRank === undefined) return -1;
      return leftRank - rightRank || left.solverIndex - right.solverIndex;
    })
    .map(({ solution }) => solution);
};
