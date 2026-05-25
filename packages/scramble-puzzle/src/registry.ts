import { UnregisteredPuzzleError } from './errors.js';
import type { WcaEventId } from './events.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

export type AnyPuzzleDefinition = PuzzleDefinition<unknown, unknown>;

export interface PuzzleRegistry {
  getByEventId(eventId: WcaEventId): AnyPuzzleDefinition;
}

export function createPuzzleRegistry(
  definitions: readonly AnyPuzzleDefinition[],
): PuzzleRegistry {
  const definitionsByEventId = new Map<WcaEventId, AnyPuzzleDefinition>();

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
}
