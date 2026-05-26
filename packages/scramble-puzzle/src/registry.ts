import { UnregisteredPuzzleError } from './errors.js';
import type { WcaEventId } from './events.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

export type AnyPuzzleDefinition<State = unknown, Move = unknown> = PuzzleDefinition<State, Move>;

export interface PuzzleRegistry<Definition extends AnyPuzzleDefinition = never> {
  getByEventId(eventId: WcaEventId): Definition;
}

export const createPuzzleRegistry = <Definition extends AnyPuzzleDefinition>(
  definitions: readonly Definition[],
): PuzzleRegistry<Definition> => {
  const definitionsByEventId = new Map<WcaEventId, Definition>();

  for (const definition of definitions) {
    for (const eventId of definition.eventIds) {
      definitionsByEventId.set(eventId, definition);
    }
  }

  return {
    getByEventId(eventId) {
      const definition = definitionsByEventId.get(eventId);

      if (definition === undefined) {
        throw new UnregisteredPuzzleError(eventId);
      }

      return definition;
    },
  };
};
