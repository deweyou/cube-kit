export interface IDANode<S, M> {
  state: S;
  move: M;
  cost: number;
}

// Overloaded internal search — returns 'FOUND', next threshold number, or Infinity
const search = <S, M>(
  state: S,
  g: number,
  threshold: number,
  isGoal: (s: S) => boolean,
  expand: (s: S) => Array<IDANode<S, M>>,
  heuristic: (s: S) => number,
  path: M[],
): 'FOUND' | number => {
  const f = g + heuristic(state);
  if (f > threshold) return f;
  if (isGoal(state)) {
    // Store path on the function object (a simple trick to return both signal + path)
    (search as unknown as { path: M[] }).path = [...path];
    return 'FOUND';
  }

  let min = Infinity;
  for (const { state: nextState, move, cost } of expand(state)) {
    path.push(move);
    const t = search(nextState, g + cost, threshold, isGoal, expand, heuristic, path);
    if (t === 'FOUND') return 'FOUND';
    if (typeof t === 'number' && t < min) min = t;
    path.pop();
  }
  return min;
};

/**
 * Generic IDA* search.
 *
 * @param root       Initial state
 * @param isGoal     Returns true when the goal is reached
 * @param expand     Returns successor nodes from a given state
 * @param heuristic  Admissible lower-bound estimate to goal (h(goal) = 0)
 * @param maxDepth   Maximum search depth before giving up
 * @returns          Sequence of moves to reach goal, or null if not found
 */
export const idaStar = <S, M>(
  root: S,
  isGoal: (state: S) => boolean,
  expand: (state: S) => Array<IDANode<S, M>>,
  heuristic: (state: S) => number,
  maxDepth: number,
): M[] | null => {
  let threshold = heuristic(root);

  while (threshold <= maxDepth) {
    const result = search(root, 0, threshold, isGoal, expand, heuristic, []);
    if (result === 'FOUND') return (search as unknown as { path: M[] }).path ?? [];
    if (typeof result === 'number') {
      threshold = result;
    } else {
      return null;
    }
  }
  return null;
};
