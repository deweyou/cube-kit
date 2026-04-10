import { rawGetScramble } from './cstimer.js';
import { WCA_EVENT_BY_ID, type ScrambleType, type WcaEventId } from './wca-events.js';

const ERROR_PREFIX = '@cubekit/scramble';

const isWcaEventId = (type: string): type is WcaEventId =>
  Object.prototype.hasOwnProperty.call(WCA_EVENT_BY_ID, type);

/**
 * Generate a scramble.
 *
 * - Pass a {@link WcaEventId} → the WCA regulation length is applied
 *   automatically unless an explicit `length` is supplied.
 * - Pass any other string → forwarded to `cstimer_module` as-is (escape hatch
 *   for non-WCA training scrambles like `f2l`, `lsell`, `2gll`).
 *
 * @throws Error if `cstimer_module` rejects the type or returns an empty result.
 */
export const getScramble = (type: ScrambleType, length?: number): string => {
  const isWca = isWcaEventId(type);
  const cstimerType = isWca ? WCA_EVENT_BY_ID[type].cstimerType : type;
  const resolvedLength = length ?? (isWca ? WCA_EVENT_BY_ID[type].length : 0);

  let result: string;
  try {
    result = rawGetScramble(cstimerType, resolvedLength);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${ERROR_PREFIX}: scramble type '${type}' was rejected by cstimer_module: ${message}`,
    );
  }

  if (!result) {
    throw new Error(
      `${ERROR_PREFIX}: cstimer_module returned an empty scramble for type '${type}'`,
    );
  }

  return result;
};
