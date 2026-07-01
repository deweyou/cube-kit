// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { CubeginPlayer, type CubeginPlayerViewFactory } from './player.js';
import type { PlayerControllerView } from '../core/player-controller.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createView = (): PlayerControllerView => ({
  renderModel: vi.fn(),
  setTimeline: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  dispose: vi.fn(),
});

describe('CubeginPlayer', () => {
  it('creates a player view, updates when props change, and disposes on unmount', async () => {
    const container = document.createElement('div');
    const firstView = createView();
    const secondView = createView();
    const viewFactory = vi
      .fn<CubeginPlayerViewFactory>()
      .mockReturnValueOnce(firstView)
      .mockReturnValueOnce(secondView);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CubeginPlayer eventId="333" formula="R" viewFactory={viewFactory} />);
    });

    expect(viewFactory).toHaveBeenCalledTimes(1);
    expect(firstView.renderModel).toHaveBeenCalledWith(
      expect.objectContaining({ pieces: expect.any(Array) }),
    );

    await act(async () => {
      root.render(<CubeginPlayer eventId="444" formula="Rw" viewFactory={viewFactory} />);
    });

    expect(firstView.dispose).toHaveBeenCalledTimes(1);
    expect(secondView.renderModel).toHaveBeenCalledWith(
      expect.objectContaining({ pieces: expect.any(Array) }),
    );

    await act(async () => {
      root.unmount();
    });

    expect(secondView.dispose).toHaveBeenCalledTimes(1);
  });

  it('shows move-step progress and lets playback speed change', async () => {
    const container = document.createElement('div');
    const view = createView();
    const viewFactory = vi.fn<CubeginPlayerViewFactory>().mockReturnValue(view);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CubeginPlayer eventId="333" formula="R U F" viewFactory={viewFactory} />);
    });

    const progress = container.querySelector<HTMLInputElement>('input[aria-label="Player progress"]');
    const speed = container.querySelector<HTMLSelectElement>('select[aria-label="Playback speed"]');
    const playButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Play',
    );

    expect(progress?.max).toBe('3');
    expect(progress?.step).toBe('1');
    expect(progress?.value).toBe('0');
    expect(speed?.value).toBe('1');

    await act(async () => {
      if (speed) speed.value = '2';
      speed?.dispatchEvent(new Event('change', { bubbles: true }));
      playButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

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

    await act(async () => {
      playOptions?.onProgress(0.7);
    });

    expect(progress?.value).toBe('2');
  });
});
