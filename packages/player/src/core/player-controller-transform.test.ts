import { describe, expect, it, vi } from 'vitest';
import { createPlayerController, type PlayerControllerView } from './player-controller.js';
import type { PlayerPuzzleAdapter } from '../puzzles/puzzle-adapter.js';

const registryMock = vi.hoisted(() => ({
  getPlayerPuzzleAdapter: vi.fn(),
}));

vi.mock('../puzzles/puzzle-registry.js', () => registryMock);

const createView = (overrides: Partial<PlayerControllerView> = {}): PlayerControllerView => ({
  dispose: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  renderModel: vi.fn(),
  resetCameraOrbit: vi.fn(),
  seek: vi.fn(),
  setTimeline: vi.fn(),
  ...overrides,
});

describe('createPlayerController transform adapters', () => {
  it('uses transform methods instead of legacy move methods when adapters provide them', () => {
    const setTimeline = vi.fn();
    const view = createView({ setTimeline });
    const move = { name: 'turn' };
    const state = { phase: 'start' };
    const nextState = { phase: 'end' };
    const transform = {
      move,
      operations: [
        {
          affectedPieceIds: ['piece-0'],
          angleRadians: Math.PI / 2,
          axis: { x: 0, y: 1, z: 0 },
          pivot: { x: 0, y: 0, z: 0 },
          type: 'axis-rotation' as const,
        },
      ],
    };
    const adapter = {
      applyMove: vi.fn(() => nextState),
      commitTransform: vi.fn(() => nextState),
      createInitialState: vi.fn(() => state),
      createRenderableModel: vi.fn(() => ({ cameraDistance: 1, pieces: [] })),
      describeMove: vi.fn(() => ({
        affectedPieceIds: [],
        angleRadians: 0,
        axis: { x: 0, y: 1, z: 0 },
        move,
        pivot: { x: 0, y: 0, z: 0 },
      })),
      describeTransform: vi.fn(() => transform),
      eventIds: ['333'],
      parseFormula: vi.fn(() => [move]),
      type: 'cube',
    } satisfies PlayerPuzzleAdapter<typeof move, typeof state>;

    registryMock.getPlayerPuzzleAdapter.mockReturnValue(adapter);

    createPlayerController(view, {
      eventId: '333',
      formula: 'R',
      initialPosition: 'start',
    });

    expect(adapter.describeTransform).toHaveBeenCalledWith(move, state);
    expect(adapter.commitTransform).toHaveBeenCalledWith(state, transform);
    expect(adapter.describeMove).not.toHaveBeenCalled();
    expect(adapter.applyMove).not.toHaveBeenCalled();
    expect(setTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            animation: undefined,
            transform,
          }),
        ],
      }),
    );
  });
});
