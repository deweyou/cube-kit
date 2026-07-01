import * as THREE from 'three';
import type { PlayerControllerView } from '../core/player-controller.js';
import type { PlayerTimeline } from '../core/timeline.js';
import type {
  PlayerMoveAnimation,
  PlayerRenderableModel,
  PlayerRenderablePiece,
  PlayerRenderableSticker,
  QuaternionLike,
  Vector3Like,
} from '../puzzles/puzzle-adapter.js';
import { updateOrbitStateFromPointerDelta, type OrbitState } from './camera-controls.js';

export interface ThreePlayerRenderer {
  readonly domElement: HTMLElement;
  setPixelRatio(pixelRatio: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

export interface ThreePlayerViewOptions {
  readonly rendererFactory?: () => ThreePlayerRenderer;
  readonly cancelAnimationFrame?: (handle: number) => void;
  readonly now?: () => number;
  readonly pixelRatio?: number;
  readonly requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  readonly width?: number;
  readonly height?: number;
}

interface RenderedPiece {
  readonly id: string;
  readonly initialPosition: THREE.Vector3;
  readonly initialQuaternion: THREE.Quaternion;
  readonly mesh: THREE.Object3D;
}

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 300;
const DEFAULT_CAMERA_DISTANCE = 8.5;
const INITIAL_ORBIT_STATE = {
  distance: DEFAULT_CAMERA_DISTANCE,
  pitch: 0.5,
  yaw: 0.6,
} satisfies OrbitState;

const createDefaultRenderer = (): ThreePlayerRenderer =>
  new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

const vectorFrom = (vector: Vector3Like): THREE.Vector3 =>
  new THREE.Vector3(vector.x, vector.y, vector.z);

const quaternionFrom = (quaternion: QuaternionLike): THREE.Quaternion =>
  new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

const createBodyMaterial = (color: string): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });

const createStickerMaterial = (color: string): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    side: THREE.DoubleSide,
  });

const createPolygonGeometry = (polygon: readonly Vector3Like[]): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const vertices = polygon.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]);
  const indices: number[] = [];

  for (let index = 1; index < polygon.length - 1; index += 1) {
    indices.push(0, index, index + 1);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

const createStickerMesh = (sticker: PlayerRenderableSticker): THREE.Mesh => {
  const mesh = new THREE.Mesh(
    createPolygonGeometry(sticker.polygon),
    createStickerMaterial(sticker.color),
  );

  mesh.name = sticker.id;

  return mesh;
};

const createPieceMesh = (piece: PlayerRenderablePiece): THREE.Group => {
  const group = new THREE.Group();

  group.name = piece.id;
  group.position.copy(vectorFrom(piece.position));
  group.quaternion.copy(quaternionFrom(piece.orientation));

  if (piece.body !== undefined) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(piece.body.size, piece.body.size, piece.body.size),
      createBodyMaterial(piece.body.color),
    );

    body.name = `${piece.id}-body`;
    group.add(body);
  }

  for (const sticker of piece.stickers) {
    group.add(createStickerMesh(sticker));
  }

  return group;
};

const disposeObject = (object: THREE.Object3D): void => {
  if (!(object instanceof THREE.Mesh)) return;

  object.geometry.dispose();

  const materials = Array.isArray(object.material) ? object.material : [object.material];
  for (const material of materials) {
    material.dispose();
  }
};

export const createThreePlayerView = (
  container: HTMLElement,
  options: ThreePlayerViewOptions = {},
): PlayerControllerView => {
  const renderer = options.rendererFactory?.() ?? createDefaultRenderer();
  const scene = new THREE.Scene();
  const width = (options.width ?? container.clientWidth) || DEFAULT_WIDTH;
  const height = (options.height ?? container.clientHeight) || DEFAULT_HEIGHT;
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  const requestFrame = options.requestAnimationFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
  const cancelFrame = options.cancelAnimationFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis);
  const now = options.now ?? (() => performance.now());

  let activePointer:
    | {
        readonly id: number;
        readonly x: number;
        readonly y: number;
      }
    | undefined;
  let currentProgress = 0;
  let currentTimeline: PlayerTimeline | undefined;
  let frameHandle: number | undefined;
  let modelGroup: THREE.Group | undefined;
  let orbitState = INITIAL_ORBIT_STATE;
  let renderedPieces: RenderedPiece[] = [];

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const applyCameraOrbit = (): void => {
    const horizontalDistance = orbitState.distance * Math.cos(orbitState.pitch);

    camera.position.set(
      horizontalDistance * Math.sin(orbitState.yaw),
      orbitState.distance * Math.sin(orbitState.pitch),
      horizontalDistance * Math.cos(orbitState.yaw),
    );
    camera.lookAt(0, 0, 0);
  };

  const renderScene = (): void => {
    renderer.render(scene, camera);
  };

  const resetRenderedPieces = (): void => {
    for (const piece of renderedPieces) {
      piece.mesh.position.copy(piece.initialPosition);
      piece.mesh.quaternion.copy(piece.initialQuaternion);
    }
  };

  const applyAnimation = (animation: PlayerMoveAnimation | undefined, progress: number): void => {
    if (animation === undefined) return;

    const affectedPieceIds = new Set(animation.affectedPieceIds);
    const axis = vectorFrom(animation.axis).normalize();
    const pivot = vectorFrom(animation.pivot);
    const angleRadians = animation.angleRadians * progress;
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angleRadians);

    for (const piece of renderedPieces) {
      if (!affectedPieceIds.has(piece.id)) continue;

      piece.mesh.position.sub(pivot).applyAxisAngle(axis, angleRadians).add(pivot);
      piece.mesh.quaternion.premultiply(rotation);
    }
  };

  const applyTimelineProgress = (progress: number): void => {
    currentProgress = Math.min(Math.max(progress, 0), 1);
    resetRenderedPieces();

    if (currentTimeline === undefined || currentTimeline.steps.length === 0) {
      renderScene();
      return;
    }

    const targetMs = currentTimeline.totalDurationMs * currentProgress;
    let elapsedMs = 0;

    for (const step of currentTimeline.steps) {
      const nextElapsedMs = elapsedMs + step.durationMs;
      const isComplete = currentProgress === 1 || targetMs >= nextElapsedMs;

      if (isComplete) {
        applyAnimation(step.animation, 1);
        elapsedMs = nextElapsedMs;
        continue;
      }

      const stepProgress =
        step.durationMs === 0 ? 1 : Math.max((targetMs - elapsedMs) / step.durationMs, 0);

      applyAnimation(step.animation, stepProgress);
      break;
    }

    renderScene();
  };

  const cancelPendingFrame = (): void => {
    if (frameHandle === undefined || cancelFrame === undefined) return;

    cancelFrame(frameHandle);
    frameHandle = undefined;
  };

  const disposeModelGroup = (): void => {
    if (modelGroup === undefined) return;

    modelGroup.traverse(disposeObject);
    scene.remove(modelGroup);
    modelGroup = undefined;
    renderedPieces = [];
  };

  const handlePointerDown = (event: PointerEvent): void => {
    activePointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    renderer.domElement.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (activePointer === undefined || activePointer.id !== event.pointerId) return;

    orbitState = updateOrbitStateFromPointerDelta(orbitState, {
      deltaX: event.clientX - activePointer.x,
      deltaY: event.clientY - activePointer.y,
    });
    activePointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    applyCameraOrbit();
    renderScene();
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (activePointer?.id !== event.pointerId) return;

    renderer.domElement.releasePointerCapture?.(event.pointerId);
    activePointer = undefined;
  };

  applyCameraOrbit();
  renderer.setPixelRatio(options.pixelRatio ?? 1);
  renderer.setSize(width, height, false);
  container.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('pointercancel', handlePointerUp);

  return {
    renderModel: (model: PlayerRenderableModel) => {
      disposeModelGroup();
      orbitState = {
        ...orbitState,
        distance: model.cameraDistance,
      };
      applyCameraOrbit();

      const nextGroup = new THREE.Group();
      const nextPieces: RenderedPiece[] = [];

      nextGroup.name = 'puzzle-model';

      for (const piece of model.pieces) {
        const pieceMesh = createPieceMesh(piece);

        nextGroup.add(pieceMesh);
        nextPieces.push({
          id: piece.id,
          initialPosition: pieceMesh.position.clone(),
          initialQuaternion: pieceMesh.quaternion.clone(),
          mesh: pieceMesh,
        });
      }

      modelGroup = nextGroup;
      renderedPieces = nextPieces;
      scene.add(nextGroup);
      applyTimelineProgress(currentProgress);
    },
    setTimeline: (timeline) => {
      currentTimeline = timeline;
      applyTimelineProgress(0);
    },
    play: ({ playbackRate, onProgress }) => {
      if (
        currentTimeline === undefined ||
        currentTimeline.totalDurationMs === 0 ||
        requestFrame === undefined
      ) {
        applyTimelineProgress(1);
        onProgress(1);
        return;
      }

      cancelPendingFrame();

      const startTime =
        now() - (currentProgress * currentTimeline.totalDurationMs) / playbackRate;
      const tick: FrameRequestCallback = (timestamp) => {
        if (currentTimeline === undefined) return;

        const nextProgress =
          ((timestamp - startTime) * playbackRate) / currentTimeline.totalDurationMs;
        applyTimelineProgress(nextProgress);
        onProgress(currentProgress);

        if (currentProgress < 1) {
          frameHandle = requestFrame(tick);
        } else {
          frameHandle = undefined;
        }
      };

      frameHandle = requestFrame(tick);
    },
    pause: () => {
      cancelPendingFrame();
    },
    seek: (progress) => {
      cancelPendingFrame();
      applyTimelineProgress(progress);
    },
    dispose: () => {
      cancelPendingFrame();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp);
      disposeModelGroup();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
};
