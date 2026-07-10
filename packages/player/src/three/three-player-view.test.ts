// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createThreePlayerView,
  type ThreePlayerRenderer,
  type ThreePlayerViewOptions,
} from './three-player-view.js';
import { createPlayerTimeline, getTimelineProgressForStepPosition } from '../core/timeline.js';
import type {
  PlayerMoveAnimation,
  PlayerRenderableModel,
  PlayerRenderablePiece,
} from '../puzzles/puzzle-adapter.js';
import { createSquareOnePlayerAdapter } from '../puzzles/square1/square1-player-adapter.js';

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

const getLastCameraPosition = (renderer: ThreePlayerRenderer): THREE.Vector3 => {
  const calls = (
    renderer.render as unknown as {
      readonly mock: {
        readonly calls: readonly (readonly [unknown, THREE.Camera])[];
      };
    }
  ).mock.calls;
  const camera = calls[calls.length - 1]?.[1];

  if (camera === undefined) {
    throw new Error('renderer did not receive a camera');
  }

  return camera.position.clone();
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

const setContainerSize = (container: HTMLElement, width: number, height: number): void => {
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(container, 'clientHeight', { configurable: true, value: height });
};

const dispatchPointerEvent = (
  element: HTMLElement,
  type: string,
  point: { readonly x: number; readonly y: number; readonly pointerId?: number },
): void => {
  const event = new Event(type, { bubbles: true }) as PointerEvent;

  Object.defineProperties(event, {
    clientX: { value: point.x },
    clientY: { value: point.y },
    pointerId: { value: point.pointerId ?? 1 },
  });
  element.dispatchEvent(event);
};

const getMeshColorHex = (mesh: THREE.Mesh): string => {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

  if (
    !(material instanceof THREE.MeshBasicMaterial) &&
    !(material instanceof THREE.MeshStandardMaterial)
  ) {
    throw new Error('mesh material did not expose a color');
  }

  return `#${material.color.getHexString()}`;
};

const getRenderedPiecePositions = (puzzleGroup: THREE.Group): ReadonlyMap<string, THREE.Vector3> =>
  new Map(
    puzzleGroup.children
      .filter((child) => child.name.startsWith('square1-piece-'))
      .map((child) => [child.name, child.position.clone()]),
  );

const getRenderedPiecePoses = (
  puzzleGroup: THREE.Group,
): ReadonlyMap<
  string,
  {
    readonly position: THREE.Vector3;
    readonly quaternion: THREE.Quaternion;
  }
> =>
  new Map(
    puzzleGroup.children
      .filter(
        (child) =>
          child.name.startsWith('square1-piece-') ||
          child.name.startsWith('square1-middle-') ||
          child.name === 'square1-core',
      )
      .map((child) => [
        child.name,
        {
          position: child.position.clone(),
          quaternion: child.quaternion.clone(),
        },
      ]),
  );

const createSquareOnePlaybackFixture = (
  formula: string,
): {
  readonly finalModel: PlayerRenderableModel;
  readonly initialModel: PlayerRenderableModel;
  readonly timeline: ReturnType<typeof createPlayerTimeline>;
} => {
  const adapter = createSquareOnePlayerAdapter();
  let nextState = adapter.createInitialState();
  const initialModel = adapter.createRenderableModel(nextState);
  const modelsByCompletedStepCount = adapter.shouldRebuildModelAfterEachMove
    ? [initialModel]
    : undefined;
  const timelineInputs = adapter.parseFormula(formula).map((move) => {
    const transform = adapter.describeTransform?.(move, nextState);
    const animation = transform === undefined ? adapter.describeMove(move, nextState) : undefined;

    nextState =
      transform !== undefined && adapter.commitTransform !== undefined
        ? adapter.commitTransform(nextState, transform)
        : adapter.applyMove(nextState, move);
    modelsByCompletedStepCount?.push(adapter.createRenderableModel(nextState));

    return {
      animation,
      durationMultiplier: transform?.durationMultiplier ?? animation?.durationMultiplier,
      move,
      transform,
    };
  });

  return {
    finalModel: adapter.createRenderableModel(nextState),
    initialModel,
    timeline: createPlayerTimeline(timelineInputs, { modelsByCompletedStepCount }),
  };
};

const expectRenderedPoseToMatchPiece = (
  renderedPoses: ReadonlyMap<
    string,
    {
      readonly position: THREE.Vector3;
      readonly quaternion: THREE.Quaternion;
    }
  >,
  expectedPiece: PlayerRenderablePiece,
): void => {
  const actualPose = renderedPoses.get(expectedPiece.id);

  expect(actualPose, expectedPiece.id).toBeDefined();
  if (actualPose === undefined) return;

  expect(actualPose.position.x, expectedPiece.id).toBeCloseTo(expectedPiece.position.x, 4);
  expect(actualPose.position.y, expectedPiece.id).toBeCloseTo(expectedPiece.position.y, 4);
  expect(actualPose.position.z, expectedPiece.id).toBeCloseTo(expectedPiece.position.z, 4);

  const expectedQuaternion = new THREE.Quaternion(
    expectedPiece.orientation.x,
    expectedPiece.orientation.y,
    expectedPiece.orientation.z,
    expectedPiece.orientation.w,
  );

  expect(Math.abs(actualPose.quaternion.dot(expectedQuaternion)), expectedPiece.id).toBeCloseTo(
    1,
    4,
  );
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

const createNamedTestModel = (pieceId: string, x = 0): PlayerRenderableModel => ({
  cameraDistance: 8,
  pieces: [
    {
      id: pieceId,
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      position: { x, y: 0, z: 0 },
      stickers: [],
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

  it('uses a model-specific camera orbit when provided', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel({
      ...createTestModel(8),
      cameraOrbit: { pitch: 0, yaw: 0 },
    });

    const cameraPosition = getLastCameraPosition(renderer);

    expect(cameraPosition.x).toBeCloseTo(0);
    expect(cameraPosition.y).toBeCloseTo(0);
    expect(cameraPosition.z).toBeCloseTo(8);
  });

  it('resets the camera orbit to the current model default', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel({
      ...createTestModel(8),
      cameraOrbit: { pitch: 0, yaw: 0 },
    });

    dispatchPointerEvent(renderer.domElement, 'pointerdown', { x: 10, y: 10 });
    dispatchPointerEvent(renderer.domElement, 'pointermove', { x: 110, y: 60 });
    dispatchPointerEvent(renderer.domElement, 'pointerup', { x: 110, y: 60 });

    const movedPosition = getLastCameraPosition(renderer);

    expect(movedPosition.x).not.toBeCloseTo(0);

    view.resetCameraOrbit();

    const resetPosition = getLastCameraPosition(renderer);

    expect(resetPosition.x).toBeCloseTo(0);
    expect(resetPosition.y).toBeCloseTo(0);
    expect(resetPosition.z).toBeCloseTo(8);
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

    const body = (pieceGroup as THREE.Group).children.find(
      (child) => child.name === 'piece-0-body',
    );
    const sticker = (pieceGroup as THREE.Group).children.find(
      (child) => child.name === 'sticker-0',
    );

    expect(body).toBeInstanceOf(THREE.Mesh);
    expect(((body as THREE.Mesh).geometry as THREE.BoxGeometry).parameters.width).toBe(1);
    expect(sticker).toBeInstanceOf(THREE.Mesh);
  });

  it('renders cylindrical body meshes for round controls', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const model: PlayerRenderableModel = {
      cameraDistance: 8,
      pieces: [
        {
          body: { color: '#111827', depth: 0.16, radius: 0.08, type: 'cylinder' },
          id: 'pin-0',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 0, y: 0, z: 0 },
          stickers: [],
        },
      ],
    };

    view.renderModel(model);

    const scene = getLastRenderedScene(renderer);
    const puzzleGroup = getRenderedPuzzleGroup(scene);
    const pieceGroup = puzzleGroup.children.find((child) => child.name === 'pin-0');
    const body = (pieceGroup as THREE.Group).children.find((child) => child.name === 'pin-0-body');

    expect(body).toBeInstanceOf(THREE.Mesh);
    expect(((body as THREE.Mesh).geometry as THREE.CylinderGeometry).parameters.radiusTop).toBe(
      0.08,
    );
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

    const body = (pieceGroup as THREE.Group).children.find(
      (child) => child.name === 'piece-0-body',
    );
    const sticker = (pieceGroup as THREE.Group).children.find(
      (child) => child.name === 'sticker-0',
    );

    expect(body).toBeInstanceOf(THREE.Mesh);
    expect(sticker).toBeInstanceOf(THREE.Mesh);
    expect((body as THREE.Mesh).material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect((sticker as THREE.Mesh).material).toBeInstanceOf(THREE.MeshBasicMaterial);
  });

  it('resizes the renderer when the viewport box changes size', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const resizeObserver = {
      disconnect: vi.fn(),
      observe: vi.fn(),
    };
    let resizeCallback: ResizeObserverCallback | undefined;

    setContainerSize(container, 400, 300);

    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
      resizeObserverFactory: (callback: ResizeObserverCallback) => {
        resizeCallback = callback;

        return resizeObserver;
      },
    } as unknown as ThreePlayerViewOptions);

    expect(renderer.setSize).toHaveBeenLastCalledWith(400, 300, false);
    expect(resizeObserver.observe).toHaveBeenCalledWith(container);

    setContainerSize(container, 520, 360);
    resizeCallback?.([], resizeObserver as unknown as ResizeObserver);

    expect(renderer.setSize).toHaveBeenLastCalledWith(520, 360, false);
    expect(renderer.render).toHaveBeenCalled();

    view.dispose();

    expect(resizeObserver.disconnect).toHaveBeenCalled();
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

  it('can rotate affected pieces in place without moving their positions', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const model = createTestModel();
    const animation: PlayerMoveAnimation<{ readonly name: string }> = {
      affectedPieceIds: ['piece-0'],
      angleRadians: Math.PI / 2,
      axis: { x: 0, y: 0, z: 1 },
      move: { name: 'dial-turn' },
      pivot: { x: 0, y: 0, z: 0 },
      rotateInPlace: true,
    };

    view.renderModel({
      ...model,
      pieces: [
        {
          ...model.pieces[0],
          position: { x: 2, y: 0, z: 0 },
        },
      ],
    });
    view.setTimeline(createPlayerTimeline([{ move: animation.move, animation }]));
    view.seek(1);

    const pieceGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children.find(
      (child) => child.name === 'piece-0',
    );

    expect(pieceGroup?.position.x).toBeCloseTo(2);
    expect(pieceGroup?.position.y).toBeCloseTo(0);
  });

  it('applies every axis-rotation operation in an active transform', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const transform = {
      move: { notation: '(1,1)' },
      operations: [
        {
          affectedPieceIds: ['top-piece'],
          angleRadians: Math.PI / 2,
          axis: { x: 0, y: 1, z: 0 },
          pivot: { x: 0, y: 0, z: 0 },
          type: 'axis-rotation' as const,
        },
        {
          affectedPieceIds: ['bottom-piece'],
          angleRadians: -Math.PI / 2,
          axis: { x: 0, y: 1, z: 0 },
          pivot: { x: 0, y: 0, z: 0 },
          type: 'axis-rotation' as const,
        },
      ],
    };

    view.renderModel({
      cameraDistance: 8,
      pieces: [
        {
          id: 'top-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: 1, z: 0 },
          stickers: [],
        },
        {
          id: 'bottom-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: -1, z: 0 },
          stickers: [],
        },
      ],
    });
    view.setTimeline(createPlayerTimeline([{ move: transform.move, transform }]));
    view.seek(0.5);

    const children = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children;
    const topPiece = children.find((child) => child.name === 'top-piece');
    const bottomPiece = children.find((child) => child.name === 'bottom-piece');

    expect(topPiece?.position.x).toBeCloseTo(Math.SQRT1_2);
    expect(topPiece?.position.z).toBeCloseTo(-Math.SQRT1_2);
    expect(bottomPiece?.position.x).toBeCloseTo(Math.SQRT1_2);
    expect(bottomPiece?.position.z).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps target-pose axis rotations rigid before the target blend window', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const transform = {
      move: { notation: 'shape-changing-turn' },
      operations: [
        {
          affectedPieceIds: ['piece-a', 'piece-b'],
          angleRadians: Math.PI / 2,
          axis: { x: 0, y: 1, z: 0 },
          pivot: { x: 0, y: 0, z: 0 },
          targetPoseBlendStart: 0.9,
          targetPositionByPieceId: {
            'piece-a': { x: 4, y: 0, z: 0 },
            'piece-b': { x: -4, y: 0, z: 0 },
          },
          type: 'axis-rotation' as const,
        },
      ],
    };

    view.renderModel({
      cameraDistance: 8,
      pieces: [
        {
          id: 'piece-a',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: 0, z: 0 },
          stickers: [],
        },
        {
          id: 'piece-b',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: -1, y: 0, z: 0 },
          stickers: [],
        },
      ],
    });
    view.setTimeline(createPlayerTimeline([{ move: transform.move, transform }]));
    view.seek(0.5);

    const children = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children;
    const pieceA = children.find((child) => child.name === 'piece-a');
    const pieceB = children.find((child) => child.name === 'piece-b');

    expect(pieceA?.position.x).toBeCloseTo(Math.SQRT1_2);
    expect(pieceA?.position.z).toBeCloseTo(-Math.SQRT1_2);
    expect(pieceB?.position.x).toBeCloseTo(-Math.SQRT1_2);
    expect(pieceB?.position.z).toBeCloseTo(Math.SQRT1_2);
  });

  it('keeps target-only pieces out of the rotation group before target blending', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const transform = {
      move: { notation: 'shape-changing-turn' },
      operations: [
        {
          affectedPieceIds: ['turning-piece', 'target-only-piece'],
          angleRadians: Math.PI / 2,
          axis: { x: 0, y: 1, z: 0 },
          pivot: { x: 0, y: 0, z: 0 },
          rotationAffectedPieceIds: ['turning-piece'],
          targetPoseBlendStart: 0.9,
          targetPositionByPieceId: {
            'target-only-piece': { x: 4, y: 0, z: 0 },
            'turning-piece': { x: 0, y: 0, z: -1 },
          },
          type: 'axis-rotation' as const,
        },
      ],
    };

    view.renderModel({
      cameraDistance: 8,
      pieces: [
        {
          id: 'turning-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: 0, z: 0 },
          stickers: [],
        },
        {
          id: 'target-only-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: -1, y: 0, z: 0 },
          stickers: [],
        },
      ],
    });
    view.setTimeline(createPlayerTimeline([{ move: transform.move, transform }]));
    view.seek(0.5);

    const children = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children;
    const turningPiece = children.find((child) => child.name === 'turning-piece');
    const targetOnlyPiece = children.find((child) => child.name === 'target-only-piece');

    expect(turningPiece?.position.x).toBeCloseTo(Math.SQRT1_2);
    expect(turningPiece?.position.z).toBeCloseTo(-Math.SQRT1_2);
    expect(targetOnlyPiece?.position.x).toBeCloseTo(-1);
    expect(targetOnlyPiece?.position.z).toBeCloseTo(0);
  });

  it('keeps Square-1 slash playback compact at the active half turn', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [tupleMove, slashMove] = adapter.parseFormula('(1,0) /');
    const initialState = adapter.createInitialState();
    const initialModel = adapter.createRenderableModel(initialState);
    const tupleTransform =
      tupleMove === undefined ? undefined : adapter.describeTransform?.(tupleMove, initialState);

    expect(tupleMove).toBeDefined();
    expect(slashMove).toBeDefined();
    expect(tupleTransform).toBeDefined();
    if (tupleMove === undefined || slashMove === undefined || tupleTransform === undefined) return;

    const afterTupleState = adapter.commitTransform!(initialState, tupleTransform);
    const slashTransform = adapter.describeTransform?.(slashMove, afterTupleState);

    expect(slashTransform).toBeDefined();
    if (slashTransform === undefined) return;

    const timeline = createPlayerTimeline([
      { move: tupleMove, transform: tupleTransform },
      { move: slashMove, transform: slashTransform },
    ]);
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(initialModel);
    view.setTimeline(timeline);
    view.seek(getTimelineProgressForStepPosition(timeline, 1.5));

    const box = new THREE.Box3().setFromObject(
      getRenderedPuzzleGroup(getLastRenderedScene(renderer)),
    );
    const size = box.getSize(new THREE.Vector3());

    expect(size.x).toBeLessThan(4.2);
    expect(size.y).toBeLessThan(4.2);
    expect(size.z).toBeLessThan(4.2);
  });

  it('renders the Square-1 slash end frame from the canonical checkpoint', () => {
    const { finalModel, initialModel, timeline } = createSquareOnePlaybackFixture('(1,0) /');
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    expect(timeline.modelsByCompletedStepCount).toHaveLength(3);

    view.renderModel(initialModel);
    view.setTimeline(timeline);
    view.seek(1);

    const renderedPoses = getRenderedPiecePoses(
      getRenderedPuzzleGroup(getLastRenderedScene(renderer)),
    );

    for (const expectedPiece of finalModel.pieces) {
      expectRenderedPoseToMatchPiece(renderedPoses, expectedPiece);
    }
  });

  it('turns every visually top Square-1 piece after a completed slash', () => {
    const adapter = createSquareOnePlayerAdapter();
    const [firstTupleMove, slashMove, secondTupleMove] = adapter.parseFormula('(1,-1) / (3,0)');
    const initialState = adapter.createInitialState();
    const initialModel = adapter.createRenderableModel(initialState);
    const firstTupleTransform =
      firstTupleMove === undefined
        ? undefined
        : adapter.describeTransform?.(firstTupleMove, initialState);

    expect(firstTupleMove).toBeDefined();
    expect(slashMove).toBeDefined();
    expect(secondTupleMove).toBeDefined();
    expect(firstTupleTransform).toBeDefined();
    if (
      firstTupleMove === undefined ||
      slashMove === undefined ||
      secondTupleMove === undefined ||
      firstTupleTransform === undefined
    ) {
      return;
    }

    const afterFirstTupleState = adapter.commitTransform!(initialState, firstTupleTransform);
    const slashTransform = adapter.describeTransform?.(slashMove, afterFirstTupleState);

    expect(slashTransform).toBeDefined();
    if (slashTransform === undefined) return;

    const afterSlashState = adapter.commitTransform!(afterFirstTupleState, slashTransform);
    const secondTupleTransform = adapter.describeTransform?.(secondTupleMove, afterSlashState);

    expect(secondTupleTransform).toBeDefined();
    if (secondTupleTransform === undefined) return;

    const timeline = createPlayerTimeline([
      { move: firstTupleMove, transform: firstTupleTransform },
      { move: slashMove, transform: slashTransform },
      { move: secondTupleMove, transform: secondTupleTransform },
    ]);
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(initialModel);
    view.setTimeline(timeline);
    view.seek(getTimelineProgressForStepPosition(timeline, 2));

    const beforeTurnPositions = getRenderedPiecePositions(
      getRenderedPuzzleGroup(getLastRenderedScene(renderer)),
    );
    const visuallyTopPieceIds = [...beforeTurnPositions.entries()]
      .filter(([, position]) => position.y > 0.2)
      .map(([pieceId]) => pieceId);

    expect(visuallyTopPieceIds.length).toBeGreaterThan(0);

    view.seek(getTimelineProgressForStepPosition(timeline, 2.5));

    const activeTurnPositions = getRenderedPiecePositions(
      getRenderedPuzzleGroup(getLastRenderedScene(renderer)),
    );
    const unmovedTopPieceIds = visuallyTopPieceIds.filter((pieceId) => {
      const beforeTurnPosition = beforeTurnPositions.get(pieceId);
      const activeTurnPosition = activeTurnPositions.get(pieceId);

      return (
        beforeTurnPosition !== undefined &&
        activeTurnPosition !== undefined &&
        beforeTurnPosition.distanceTo(activeTurnPosition) < 0.05
      );
    });

    expect(unmovedTopPieceIds).toEqual([]);
  });

  it('renders long Square-1 scrambles at the canonical final checkpoint', () => {
    const { finalModel, initialModel, timeline } = createSquareOnePlaybackFixture(
      '(-2,0) / (5,2) / (0,-3) / (1,-2) / (6,0) / (0,-3) / (0,-1) / (0,-3) / (3,-2) / (2,0) / (-4,0) / (1,0) / (4,-1) /',
    );
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel(initialModel);
    view.setTimeline(timeline);
    view.seek(1);

    const renderedPoses = getRenderedPiecePoses(
      getRenderedPuzzleGroup(getLastRenderedScene(renderer)),
    );

    for (const expectedPiece of finalModel.pieces) {
      expectRenderedPoseToMatchPiece(renderedPoses, expectedPiece);
    }
  });

  it('can pulse affected piece positions during the active step', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const model = createTestModel();
    const animation: PlayerMoveAnimation<{ readonly name: string }> = {
      affectedPieceIds: ['piece-0'],
      angleRadians: 0,
      axis: { x: 0, y: 0, z: 1 },
      move: { name: 'pin-pulse' },
      pivot: { x: 0, y: 0, z: 0 },
      positionPulseByPieceId: {
        'piece-0': { x: 0, y: 0, z: 1 },
      },
    };

    view.renderModel(model);
    view.setTimeline(createPlayerTimeline([{ move: animation.move, animation }]));
    view.seek(0.5);

    const activePieceGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children.find(
      (child) => child.name === 'piece-0',
    );

    expect(activePieceGroup?.position.z).toBeCloseTo(1);

    view.seek(1);

    const completedPieceGroup = getRenderedPuzzleGroup(
      getLastRenderedScene(renderer),
    ).children.find((child) => child.name === 'piece-0');

    expect(completedPieceGroup?.position.z).toBeCloseTo(0);
  });

  it('allows one animation to use per-piece pivots', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });

    view.renderModel({
      cameraDistance: 8,
      pieces: [
        {
          id: 'top-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: 2, z: 0 },
          stickers: [],
        },
        {
          id: 'bottom-piece',
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          position: { x: 1, y: -2, z: 0 },
          stickers: [],
        },
      ],
    });
    view.setTimeline(
      createPlayerTimeline([
        {
          animation: {
            affectedPieceIds: ['top-piece', 'bottom-piece'],
            angleRadians: Math.PI / 2,
            axis: { x: 0, y: 0, z: 1 },
            move: { name: 'turn' },
            pivot: { x: 0, y: 0, z: 0 },
            pivotByPieceId: {
              'bottom-piece': { x: 0, y: -2, z: 0 },
              'top-piece': { x: 0, y: 2, z: 0 },
            },
          },
          move: { name: 'turn' },
        },
      ]),
    );

    view.seek(1);

    const puzzleGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer));
    const topPiece = puzzleGroup.children.find((child) => child.name === 'top-piece');
    const bottomPiece = puzzleGroup.children.find((child) => child.name === 'bottom-piece');

    expect(topPiece?.position.x).toBeCloseTo(0);
    expect(topPiece?.position.y).toBeCloseTo(3);
    expect(bottomPiece?.position.x).toBeCloseTo(0);
    expect(bottomPiece?.position.y).toBeCloseTo(-1);
  });

  it('renders committed state checkpoints at completed move steps', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const initialModel = createNamedTestModel('initial-piece');
    const finalModel = createNamedTestModel('final-piece', 2);
    const animation: PlayerMoveAnimation<{ readonly name: string }> = {
      affectedPieceIds: ['initial-piece'],
      angleRadians: Math.PI / 2,
      axis: { x: 0, y: 1, z: 0 },
      move: { name: 'shape-shift' },
      pivot: { x: 0, y: 0, z: 0 },
    };

    view.renderModel(initialModel);
    view.setTimeline(
      createPlayerTimeline([{ move: animation.move, animation }], {
        modelsByCompletedStepCount: [initialModel, finalModel],
      }),
    );
    view.seek(1);

    const finalPuzzleGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer));

    expect(finalPuzzleGroup.children.some((child) => child.name === 'final-piece')).toBe(true);
    expect(finalPuzzleGroup.children.some((child) => child.name === 'initial-piece')).toBe(false);

    view.seek(0);

    const initialPuzzleGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer));

    expect(initialPuzzleGroup.children.some((child) => child.name === 'initial-piece')).toBe(true);
    expect(initialPuzzleGroup.children.some((child) => child.name === 'final-piece')).toBe(false);
  });

  it('temporarily applies sticker color pulses without recoloring the whole piece', () => {
    const container = document.createElement('div');
    const renderer = createRenderer();
    const view = createThreePlayerView(container, {
      rendererFactory: () => renderer,
    });
    const animation = {
      affectedPieceIds: ['piece-0'],
      angleRadians: 0,
      axis: { x: 0, y: 0, z: 1 },
      colorPulseByStickerId: {
        'sticker-0': '#d97706',
      },
      move: { name: 'pin-pulse' },
      pivot: { x: 0, y: 0, z: 0 },
    } as PlayerMoveAnimation<{ readonly name: string }>;

    view.renderModel(createTestModel());
    view.setTimeline(createPlayerTimeline([{ move: animation.move, animation }]));
    view.seek(0.5);

    const activePieceGroup = getRenderedPuzzleGroup(getLastRenderedScene(renderer)).children.find(
      (child) => child.name === 'piece-0',
    );
    const activeBody = (activePieceGroup as THREE.Group).children.find(
      (child) => child.name === 'piece-0-body',
    );
    const activeSticker = (activePieceGroup as THREE.Group).children.find(
      (child) => child.name === 'sticker-0',
    );

    expect(activeBody).toBeInstanceOf(THREE.Mesh);
    expect(activeSticker).toBeInstanceOf(THREE.Mesh);
    expect(getMeshColorHex(activeBody as THREE.Mesh)).toBe('#111827');
    expect(getMeshColorHex(activeSticker as THREE.Mesh)).toBe('#d97706');

    view.seek(1);

    const completedPieceGroup = getRenderedPuzzleGroup(
      getLastRenderedScene(renderer),
    ).children.find((child) => child.name === 'piece-0');
    const completedBody = (completedPieceGroup as THREE.Group).children.find(
      (child) => child.name === 'piece-0-body',
    );
    const completedSticker = (completedPieceGroup as THREE.Group).children.find(
      (child) => child.name === 'sticker-0',
    );

    expect(completedBody).toBeInstanceOf(THREE.Mesh);
    expect(completedSticker).toBeInstanceOf(THREE.Mesh);
    expect(getMeshColorHex(completedBody as THREE.Mesh)).toBe('#111827');
    expect(getMeshColorHex(completedSticker as THREE.Mesh)).toBe('#22c55e');
  });
});
