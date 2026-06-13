import { describe, expect, it } from 'vitest';

import { jsonError, jsonOk } from './output.js';

describe('json output contract', () => {
  it('wraps successful command data', () => {
    expect(jsonOk('scramble.events', { events: [] })).toEqual({
      ok: true,
      data: { events: [] },
      meta: {
        command: 'scramble.events',
        version: expect.any(String),
      },
    });
  });

  it('wraps command errors with hints', () => {
    expect(
      jsonError('UNKNOWN_EVENT', 'Unsupported event id: 777x', [
        'Run `cubegin scramble events --json`.',
      ]),
    ).toEqual({
      ok: false,
      error: {
        code: 'UNKNOWN_EVENT',
        message: 'Unsupported event id: 777x',
        hints: ['Run `cubegin scramble events --json`.'],
      },
    });
  });
});
