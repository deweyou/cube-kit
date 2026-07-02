import { describe, expect, it, vi } from 'vitest';
import { createPlayerController, type PlayerControllerView } from './player-controller.js';

const createView = (): PlayerControllerView => ({
  renderModel: vi.fn(),
  setTimeline: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  resetCameraOrbit: vi.fn(),
  dispose: vi.fn(),
});

describe('createPlayerController', () => {
  it('parses cube algorithms and sends timelines to the view', () => {
    const view = createView();

    const controller = createPlayerController(view, {
      eventId: '333',
      formula: "R U R'",
      initialPosition: 'start',
    });

    expect(view.renderModel).toHaveBeenCalledWith(
      expect.objectContaining({
        pieces: expect.any(Array),
      }),
    );
    expect(view.setTimeline).toHaveBeenCalledWith(
      expect.objectContaining({ steps: expect.arrayContaining([expect.any(Object)]) }),
    );
    expect(controller.getState()).toMatchObject({
      status: 'ready',
      eventId: '333',
      formula: "R U R'",
      progress: 0,
    });

    controller.jumpToEnd();
    expect(view.seek).toHaveBeenLastCalledWith(1);
    expect(controller.getState().progress).toBe(1);
  });

  it('exposes unsupported event errors without throwing', () => {
    const view = createView();

    const controller = createPlayerController(view, {
      eventId: 'sq1',
      formula: '(1,0)',
      initialPosition: 'start',
    });

    expect(controller.getState().status).toBe('error');
    expect(controller.getState().error?.name).toBe('UnsupportedPlayerPuzzleError');
    expect(view.renderModel).not.toHaveBeenCalled();
  });

  it('keeps the previous rendered timeline when formula parsing fails', () => {
    const view = createView();
    const controller = createPlayerController(view, {
      eventId: '333',
      formula: 'R',
      initialPosition: 'start',
    });

    const previousTimeline = controller.getState().timeline;

    expect(controller.loadFormula({ formula: 'R4' })).toBe(false);
    expect(controller.getState()).toMatchObject({
      status: 'error',
      formula: 'R',
    });
    expect(controller.getState().timeline).toBe(previousTimeline);
    expect(controller.getState().error?.name).toBe('InvalidPlayerFormulaError');
    expect(view.setTimeline).toHaveBeenCalledTimes(1);
  });

  it('tracks progress callbacks from playback and passes playback speed to the view', () => {
    const view = createView();
    const onStateChange = vi.fn();
    const controller = createPlayerController(view, {
      eventId: '333',
      formula: 'R U',
      initialPosition: 'start',
      onStateChange,
    });

    controller.setPlaybackRate(2);
    controller.play();

    expect(controller.getState().playbackRate).toBe(2);
    expect(view.play).toHaveBeenLastCalledWith({
      playbackRate: 2,
      onProgress: expect.any(Function),
    });

    const playOptions = (
      view.play as unknown as {
        readonly mock: {
          readonly calls: readonly (readonly [
            { readonly onProgress: (progress: number) => void },
          ])[];
        };
      }
    ).mock.calls.at(-1)?.[0];

    playOptions?.onProgress(0.5);

    expect(controller.getState().progress).toBe(0.5);
    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ progress: 0.5, status: 'playing' }),
    );
  });

  it('resets the camera view without changing playback progress', () => {
    const view = createView();
    const controller = createPlayerController(view, {
      eventId: '333',
      formula: 'R U',
      initialPosition: 'start',
    });

    controller.seek(0.5);

    expect(controller.resetView()).toBe(true);
    expect(view.resetCameraOrbit).toHaveBeenCalledTimes(1);
    expect(controller.getState().progress).toBe(0.5);
  });
});
