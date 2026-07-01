// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createThreePlayerView,
  type ThreePlayerRenderer,
} from './three-player-view.js';
import { createPlayerTimeline } from '../core/timeline.js';
import type { PlayerMoveAnimation, PlayerRenderableModel } from '../puzzles/puzzle-adapter.js';

const createRenderer = (): ThreePlayerRenderer => ({
  domElement: document.createElement('canvas'),
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
});

const getLastCameraDistance = (renderer: ThreePlayerRenderer): number => {
  const calls = (
    renderer.render as unknown as {
      readonly mock: {
        readonly calls: readonly (readonly [
          unknown,
          { readonly position: { length(): number } },
        ])[];
      };
    }
  ).mock.calls;
  const camera = calls[calls.length - 1]?.[1];

  if (camera === undefined) {
    throw new Error('renderer did not receive a camera');
  }

  return camera.position.length();
};

const getLastRenderedScene = (renderer: ThreePlayerRenderer): THREE.Scene => {
  const calls = (
    renderer.render as unknown as {
      readonly mock: {
        readonly calls: readonly (readonly [THREE.Scene, THREE.Camera])[];
      };
    }
  ).mock.calls;
  const scene = calls[calls.length - 1]?.[0];

  if (scene === undefined) {
    throw new Error('renderer did not receive a scene');
  }

  return scene;
};

const getRenderedPuzzleGroup = (scene: THREE.Scene): THREE.Group => {
  const puzzleGroup = scene.children.find(
    (child): child is THREE.Group => child instanceof THREE.Group && child.name === 'puzzle-model',
  );

  if (puzzleGroup === undefined) {
    throw new Error('scene did not contain the puzzle group');
  }

  return puzzleGroup;
};

const createTestModel = (cameraDistance = 8): PlayerRenderableModel => ({
  cameraDistance,
  pieces: [
    {
      body: { color: '#111827', size: 1, type: 'box' },
      id: 'piece-0',
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x: 0, y: 0, z: 0 },
      stickers: [
        {
          color: '#22c55e',
          face: 'F',
          id: 'sticker-0',
          polygon: [
            { x: -0.4, y: 0.4, z: 0.51 },
            { x: 0.4, y: 0.4, z: 0.51 },
            { x: 0.4, y: -0.4, z: 0.51 },
            { x: -0.4, y: -0.4, z: 0.51 },
          ],
        },
      ],
    },
  ],
});

const createTestAnimation = (): PlayerMoveAnimation<{ readonly name: string }> => ({
  affectedPieceIds: ['piece-0'],
  angleRadians: Math.PI / 2,
  axis: { x: 0, y: 1, z: 0 },
  move: { name: 'turn' },
  pivot: { x: 0, y: 0, z: 0 },
});

describe('createThreePlayerView', () => {
  it('mounts one renderer element and renders a puzzle model', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(renderer.domElement);

    view.renderModel(createTestModel());

    expect(renderer.render).toHaveBeenCalled();
  });

  it('frames models from their camera distance', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(createTestModel(8));
    const nearDistance = getLastCameraDistance(renderer);

    view.renderModel(createTestModel(16));
    const farDistance = getLastCameraDistance(renderer);

    expect(farDistance).toBeGreaterThan(nearDistance * 1.8);
  });

  it('renders body meshes with polygon sticker faces', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(createTestModel());

    const scene = getLastRenderedScene(renderer);
    const puzzleGroup = getRenderedPuzzleGroup(scene);
    const pieceGroup = puzzleGroup.children.find((child) => child.name === 'piece-0');

    expect(pieceGroup).toBeInstanceOf(THREE.Group);

    const body = (pieceGroup as THREE.Group).children.find((child) => child.name === 'piece-0-body');
    const sticker = (pieceGroup as THREE.Group).children.find((child) => child.name === 'sticker-0');

    expect(body).toBeInstanceOf(THREE.Mesh);
    expect(((body as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.width).toBe(1);
    expect(sticker).toBeInstanceOf(THREE.Mesh);
  });

  it('renders stickers with unlit materials so face colors stay bright', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(createTestModel());

    const scene = getLastRenderedScene(renderer);
    const puzzleGroup = getRenderedPuzzleGroup(scene);
    const pieceGroup = puzzleGroup.children.find((child) => child.name === 'piece-0');

    expect(pieceGroup).toBeInstanceOf(THREE.Group);

    const body = (pieceGroup as THREE.Group).children.find((child) => child.name === 'piece-0-body');
    const sticker = (pieceGroup as THREE.Group).children.find((child) => child.name === 'sticker-0');

    expect(body).toBeInstanceOf(THREE.Mesh);
    expect(sticker).toBeInstanceOf(THREE.Mesh);
    expect((body as THREE.Mesh).material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((sticker as THREE.Mesh).material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it('removes DOM and renderer resources on dispose', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.dispose();

    expect(container.children).toHaveLength(0);
    expect(renderer.dispose).toHaveBeenCalled();
  });

  it('advances the timeline with requestAnimationFrame while playing', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);

      return frameCallbacks.length;
    });
    const cancelAnimationFrame = vi.fn();
    const view = createThreePlayerView(container, {
      cancelAnimationFrame,
      now: () => 0,
      rendererFactory: () => renderer,
      requestAnimationFrame,
    });
    const animation = createTestAnimation();

    view.renderModel(createTestModel());
    view.setTimeline(createPlayerTimeline([{ move: animation.move, animation }]));
    const onProgress = vi.fn();
    view.play({ playbackRate: 2, onProgress });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    frameCallbacks[0](130);
    view.pause();

    expect(onProgress).toHaveBeenLastCalledWith(0.5);
    expect(renderer.render).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
