/**
 * Build a move table: table[state][moveIndex] = nextState.
 *
 * @param size      Number of states
 * @param applyMove Function that returns the next state given (state, move)
 * @param moves     Array of move descriptors
 */
export const buildMoveTable = <M>(
  size: number,
  applyMove: (state: number, move: M) => number,
  moves: M[],
): number[][] =>
  Array.from({ length: size }, (_, state) => moves.map((move) => applyMove(state, move)));
