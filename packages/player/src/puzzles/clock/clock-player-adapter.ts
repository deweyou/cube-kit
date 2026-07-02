import {
  createClockDefinition,
  getClockTurnMoveForState,
  type ClockMove,
  type ClockState,
  type ClockTurnMove,
} from '@cubegin/scramble-puzzle';
import type {
  PlayerMoveAnimation,
  PlayerPuzzleAdapter,
  PlayerRenderableModel,
  PlayerRenderablePiece,
  PlayerRenderableSticker,
  Vector3Like,
} from '../puzzle-adapter.js';

const CLOCK_MOVE_DELTAS = {
  UR: [0, 1, 1, 0, 1, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
  DR: [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0],
  DL: [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1],
  UL: [1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0],
  U: [1, 1, 1, 1, 1, 1, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0],
  R: [0, 1, 1, 0, 1, 1, 0, 1, 1, -1, 0, 0, 0, 0, 0, -1, 0, 0],
  D: [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, -1, 0, -1],
  L: [1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, -1],
  ALL: [1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 0, -1, 0, 0, 0, -1, 0, -1],
} satisfies Record<ClockTurnMove['name'], readonly number[]>;

const COLORS = {
  backBody: '#ccddee',
  backClock: '#113366',
  backHand: '#ccddee',
  backPin: '#446699',
  backTopClock: '#cc6600',
  frontBody: '#113366',
  frontClock: '#ccddee',
  frontHand: '#113366',
  frontPin: '#88aacc',
  frontTopClock: '#ffcc44',
  pinPressed: '#d97706',
  stroke: '#000000',
} as const;

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };
const CLOCK_SPACING = 0.78;
const BOARD_CENTER_RADIUS = CLOCK_SPACING / 0.6;
const BOARD_CORNER_RADIUS = BOARD_CENTER_RADIUS * 0.3;
const BOARD_FACE_INSET = 0.055;
const BOARD_OUTLINE_VERTEX_COUNT = 144;
const SIDE_Z = 0.12;
const DIAL_Z_OFFSET = 0.025;
const HAND_Z_OFFSET = 0.055;
const DIAL_RADIUS = 0.21;
const DIAL_BORDER_RADIUS = 0.27;
const HAND_LENGTH = 0.205;
const HAND_HALF_WIDTH = 0.05;
const PIN_CAP_DEPTH = 0.04;
const PIN_BODY_RADIUS = 0.088;
const PIN_FACE_RADIUS = 0.068;
const PIN_HIGHLIGHT_RADIUS = 0.022;
const PIN_SHAFT_DEPTH = 0.075;
const PIN_SHAFT_RADIUS = 0.052;
const PIN_PRESS_DISTANCE = PIN_SHAFT_DEPTH;
const PIN_POST_DEPTH = 2 * (SIDE_Z + PIN_SHAFT_DEPTH);
const TICK_RADIUS = 0.014;
const TOP_TICK_RADIUS = 0.026;
const TICK_RING_RADIUS = 0.318;
const TURN_STEP_RADIANS = Math.PI / 6;
const CLOCK_DURATION_SCALE = 2;
const CLOCK_CAMERA_ORBIT = { pitch: 0, yaw: 0 };
const CLOCK_PIN_NAMES = ['UL', 'UR', 'DL', 'DR'] as const;

type ClockPinName = (typeof CLOCK_PIN_NAMES)[number];

interface ClockSideColors {
  readonly body: string;
  readonly clock: string;
  readonly hand: string;
  readonly pin: string;
  readonly topClock: string;
}

const SIDE_COLORS = {
  back: {
    body: COLORS.backBody,
    clock: COLORS.backClock,
    hand: COLORS.backHand,
    pin: COLORS.backPin,
    topClock: COLORS.backTopClock,
  },
  front: {
    body: COLORS.frontBody,
    clock: COLORS.frontClock,
    hand: COLORS.frontHand,
    pin: COLORS.frontPin,
    topClock: COLORS.frontTopClock,
  },
} satisfies Record<ClockSideName, ClockSideColors>;

type ClockSideName = 'front' | 'back';

const CLOCK_PIN_POSITIONS = {
  DL: { x: -CLOCK_SPACING / 2, y: -CLOCK_SPACING / 2 },
  DR: { x: CLOCK_SPACING / 2, y: -CLOCK_SPACING / 2 },
  UL: { x: -CLOCK_SPACING / 2, y: CLOCK_SPACING / 2 },
  UR: { x: CLOCK_SPACING / 2, y: CLOCK_SPACING / 2 },
} satisfies Record<ClockPinName, { readonly x: number; readonly y: number }>;

const CLOCK_BOARD_CIRCLES = [
  { id: 'center', radius: BOARD_CENTER_RADIUS, vertexCount: 72, x: 0, y: 0 },
  { id: 'ul', radius: BOARD_CORNER_RADIUS, vertexCount: 36, x: -CLOCK_SPACING, y: CLOCK_SPACING },
  { id: 'ur', radius: BOARD_CORNER_RADIUS, vertexCount: 36, x: CLOCK_SPACING, y: CLOCK_SPACING },
  { id: 'dl', radius: BOARD_CORNER_RADIUS, vertexCount: 36, x: -CLOCK_SPACING, y: -CLOCK_SPACING },
  { id: 'dr', radius: BOARD_CORNER_RADIUS, vertexCount: 36, x: CLOCK_SPACING, y: -CLOCK_SPACING },
] as const;

const CLOCK_ACTIVE_PINS_BY_MOVE = {
  ALL: ['UL', 'UR', 'DL', 'DR'],
  D: ['DL', 'DR'],
  DL: ['DL'],
  DR: ['DR'],
  L: ['UL', 'DL'],
  R: ['UR', 'DR'],
  U: ['UL', 'UR'],
  UL: ['UL'],
  UR: ['UR'],
} satisfies Record<ClockTurnMove['name'], readonly ClockPinName[]>;

const sideSign = (side: ClockSideName): 1 | -1 => (side === 'front' ? 1 : -1);

const sticker = (
  id: string,
  face: string,
  color: string,
  polygon: readonly Vector3Like[],
): PlayerRenderableSticker => ({
  color,
  face,
  id,
  polygon,
});

const circlePolygon = (
  radius: number,
  center: { readonly x?: number; readonly y?: number } = {},
  vertexCount = 28,
  z = 0,
): readonly Vector3Like[] =>
  Array.from({ length: vertexCount }, (_, index) => {
    const radians = -Math.PI / 2 + (index / vertexCount) * Math.PI * 2;

    return {
      x: (center.x ?? 0) + Math.cos(radians) * radius,
      y: (center.y ?? 0) + Math.sin(radians) * radius,
      z,
    };
  });

const circleReachOnRay = (
  directionX: number,
  directionY: number,
  circle: (typeof CLOCK_BOARD_CIRCLES)[number],
): number | undefined => {
  const projection = circle.x * directionX + circle.y * directionY;
  const centerDistanceSquared = circle.x * circle.x + circle.y * circle.y;
  const perpendicularDistanceSquared = centerDistanceSquared - projection * projection;
  const radiusSquared = circle.radius * circle.radius;

  if (perpendicularDistanceSquared > radiusSquared) return undefined;

  const reach = projection + Math.sqrt(radiusSquared - perpendicularDistanceSquared);

  return reach > 0 ? reach : undefined;
};

const clockBodyBoundaryPolygon = (z = 0): readonly Vector3Like[] =>
  Array.from({ length: BOARD_OUTLINE_VERTEX_COUNT }, (_, index) => {
    const radians = -Math.PI / 2 + (index / BOARD_OUTLINE_VERTEX_COUNT) * Math.PI * 2;
    const directionX = Math.cos(radians);
    const directionY = Math.sin(radians);
    const reach = Math.max(
      ...CLOCK_BOARD_CIRCLES.map(
        (circle) => circleReachOnRay(directionX, directionY, circle) ?? 0,
      ),
    );

    return {
      x: directionX * reach,
      y: directionY * reach,
      z,
    };
  });

const clockBodyOutlinePolygon = (z = 0): readonly Vector3Like[] => {
  const boundary = clockBodyBoundaryPolygon(z);

  return [{ x: 0, y: 0, z }, ...boundary, boundary[0] ?? { x: 0, y: -BOARD_CENTER_RADIUS, z }];
};

const handPolygon = (z = 0): readonly Vector3Like[] => [
  { x: 0, y: HAND_LENGTH, z },
  { x: HAND_HALF_WIDTH, y: 0.02, z },
  { x: HAND_HALF_WIDTH * 0.45, y: -0.045, z },
  { x: -HAND_HALF_WIDTH * 0.45, y: -0.045, z },
  { x: -HAND_HALF_WIDTH, y: 0.02, z },
];

const clockGridPosition = (
  index: number,
  side: ClockSideName,
  zOffset = 0,
): Vector3Like => {
  const localIndex = index % 9;
  const column = localIndex % 3;
  const row = Math.floor(localIndex / 3);
  const x = (column - 1) * CLOCK_SPACING;

  return {
    x: side === 'back' ? -x : x,
    y: (1 - row) * CLOCK_SPACING,
    z: sideSign(side) * (SIDE_Z + zOffset),
  };
};

const pinPosition = (side: ClockSideName, pinName: ClockPinName): Vector3Like => ({
  ...CLOCK_PIN_POSITIONS[pinName],
  z: sideSign(side) * (SIDE_Z + PIN_SHAFT_DEPTH + PIN_CAP_DEPTH / 2),
});

const pinPostPosition = (pinName: ClockPinName): Vector3Like => ({
  ...CLOCK_PIN_POSITIONS[pinName],
  z: 0,
});

const createPiece = (
  id: string,
  position: Vector3Like,
  stickers: readonly PlayerRenderableSticker[],
): PlayerRenderablePiece => ({
  id,
  orientation: IDENTITY_QUATERNION,
  position,
  stickers,
});

const createBoardPiece = (side: ClockSideName): PlayerRenderablePiece => {
  const colors = SIDE_COLORS[side];
  const outward = sideSign(side);
  const faceZ = outward * 0.006;
  const faceStickers = CLOCK_BOARD_CIRCLES.map((circle, index) =>
    sticker(
      `clock-board-${side}-${circle.id}-face`,
      `${side}-body`,
      colors.body,
      circlePolygon(
        circle.radius - BOARD_FACE_INSET,
        { x: circle.x, y: circle.y },
        circle.vertexCount,
        faceZ + outward * index * 0.0002,
      ),
    ),
  );

  return createPiece(`clock-board-${side}`, { x: 0, y: 0, z: sideSign(side) * SIDE_Z }, [
    sticker(
      `clock-board-${side}-border`,
      `${side}-body-border`,
      COLORS.stroke,
      clockBodyOutlinePolygon(),
    ),
    ...faceStickers,
  ]);
};

const createBoardRimPiece = (): PlayerRenderablePiece => {
  const boundary = clockBodyBoundaryPolygon();
  const rimStickers = boundary.map((vertex, index) => {
    const nextVertex = boundary[(index + 1) % boundary.length] ?? vertex;

    return sticker(`clock-board-rim-${index}`, 'body-rim', COLORS.stroke, [
      { x: vertex.x, y: vertex.y, z: SIDE_Z },
      { x: nextVertex.x, y: nextVertex.y, z: SIDE_Z },
      { x: nextVertex.x, y: nextVertex.y, z: -SIDE_Z },
      { x: vertex.x, y: vertex.y, z: -SIDE_Z },
    ]);
  });

  return createPiece('clock-board-rim', { x: 0, y: 0, z: 0 }, rimStickers);
};

const createDialPiece = (index: number, side: ClockSideName): PlayerRenderablePiece => {
  const colors = SIDE_COLORS[side];
  const localIndex = index % 9;
  const outward = sideSign(side);
  const tickStickers = Array.from({ length: 12 }, (_, tick) => {
    const radians = Math.PI / 2 - tick * TURN_STEP_RADIANS;

    return sticker(
      `clock-dial-${index}-tick-${tick}`,
      `${side}-tick`,
      tick === 0 ? colors.topClock : colors.clock,
      circlePolygon(
        tick === 0 ? TOP_TICK_RADIUS : TICK_RADIUS,
        {
          x: Math.cos(radians) * TICK_RING_RADIUS,
          y: Math.sin(radians) * TICK_RING_RADIUS,
        },
        12,
        outward * 0.008,
      ),
    );
  });

  return createPiece(`clock-dial-${index}`, clockGridPosition(index, side, DIAL_Z_OFFSET), [
    sticker(`clock-dial-${index}-border`, `${side}-dial-border`, COLORS.stroke, circlePolygon(DIAL_BORDER_RADIUS)),
    sticker(
      `clock-dial-${index}-face`,
      `${side}-dial-${localIndex}`,
      colors.clock,
      circlePolygon(DIAL_RADIUS, {}, 28, outward * 0.004),
    ),
    ...tickStickers,
  ]);
};

const createHandPiece = (index: number, side: ClockSideName): PlayerRenderablePiece => {
  const colors = SIDE_COLORS[side];
  const position = clockGridPosition(index, side, HAND_Z_OFFSET);
  const outward = sideSign(side);

  return createPiece(
    `clock-hand-${index}`,
    position,
    [
      sticker(
        `clock-hand-${index}-shape`,
        `${side}-hand`,
        colors.hand,
        handPolygon(outward * 0.004),
      ),
      sticker(
        `clock-hand-${index}-hub`,
        `${side}-hand-hub`,
        colors.hand,
        circlePolygon(0.035, {}, 18, outward * 0.008),
      ),
    ],
  );
};

const createPinPiece = (
  side: ClockSideName,
  pinName: ClockPinName,
  position: Vector3Like,
): PlayerRenderablePiece => {
  const colors = SIDE_COLORS[side];
  const outward = sideSign(side);
  const topZ = outward * (PIN_CAP_DEPTH / 2 + 0.004);

  return {
    ...createPiece(`clock-pin-${side}-${pinName}`, position, [
      sticker(
        `clock-pin-${side}-${pinName}-rim`,
        `${side}-pin-rim`,
        COLORS.stroke,
        circlePolygon(PIN_BODY_RADIUS * 1.08, {}, 32, outward * (PIN_CAP_DEPTH / 2)),
      ),
      sticker(
        `clock-pin-${side}-${pinName}-face`,
        `${side}-pin`,
        colors.topClock,
        circlePolygon(PIN_FACE_RADIUS, {}, 32, topZ),
      ),
      sticker(
        `clock-pin-${side}-${pinName}-highlight`,
        `${side}-pin-highlight`,
        colors.pin,
        circlePolygon(
          PIN_HIGHLIGHT_RADIUS,
          { x: -PIN_FACE_RADIUS * 0.25, y: PIN_FACE_RADIUS * 0.25 },
          16,
          outward * (PIN_CAP_DEPTH / 2 + 0.007),
        ),
      ),
    ]),
    body: {
      color: COLORS.stroke,
      depth: PIN_CAP_DEPTH,
      radius: PIN_BODY_RADIUS,
      type: 'cylinder',
    },
  };
};

const createPinPostPiece = (pinName: ClockPinName): PlayerRenderablePiece => ({
  ...createPiece(`clock-pin-post-${pinName}`, pinPostPosition(pinName), []),
  body: {
    color: COLORS.stroke,
    depth: PIN_POST_DEPTH,
    radius: PIN_SHAFT_RADIUS,
    type: 'cylinder',
  },
});

const createClockModel = (): PlayerRenderableModel => {
  const pieces: PlayerRenderablePiece[] = [];

  pieces.push(createBoardRimPiece());

  for (const pinName of CLOCK_PIN_NAMES) {
    pieces.push(createPinPostPiece(pinName));
  }

  for (const side of ['front', 'back'] as const) {
    const sideOffset = side === 'front' ? 0 : 9;

    pieces.push(createBoardPiece(side));

    for (let index = 0; index < 9; index += 1) {
      pieces.push(createDialPiece(sideOffset + index, side));
      pieces.push(createHandPiece(sideOffset + index, side));
    }

    for (const pinName of CLOCK_PIN_NAMES) {
      pieces.push(createPinPiece(side, pinName, pinPosition(side, pinName)));
    }
  }

  return {
    cameraOrbit: CLOCK_CAMERA_ORBIT,
    cameraDistance: 5.2,
    pieces,
  };
};

const CLOCK_MODEL = createClockModel();
const CLOCK_PIECE_IDS = CLOCK_MODEL.pieces.map((piece) => piece.id);

const physicalHandIdForLogicalIndex = (state: ClockState, logicalIndex: number): string => {
  const physicalIndex = state.rightSideUp
    ? logicalIndex
    : logicalIndex < 9
      ? logicalIndex + 9
      : logicalIndex - 9;

  return `clock-hand-${physicalIndex}`;
};

const signedAmountForMove = (move: ClockTurnMove): number =>
  move.direction === '+' ? move.amount : -move.amount;

const handAngleForLogicalIndex = (
  signedAmount: number,
  delta: number,
  logicalIndex: number,
): number => {
  const direction = logicalIndex < 9 ? -1 : 1;

  return direction * signedAmount * delta * TURN_STEP_RADIANS;
};

const activePinSideForState = (state: ClockState): ClockSideName =>
  state.rightSideUp ? 'front' : 'back';

const oppositeSide = (side: ClockSideName): ClockSideName => (side === 'front' ? 'back' : 'front');

const describeTurnMove = (
  move: ClockTurnMove,
  state: ClockState,
): PlayerMoveAnimation<ClockMove> => {
  const orientedMove = getClockTurnMoveForState(state, move);
  const signedAmount = signedAmountForMove(orientedMove);
  const angleRadiansByPieceId: Record<string, number> = {};
  const colorPulseByStickerId: Record<string, string> = {};
  const positionPulseByPieceId: Record<string, Vector3Like> = {};

  CLOCK_MOVE_DELTAS[orientedMove.name].forEach((delta, logicalIndex) => {
    if (delta === 0) return;

    const pieceId = physicalHandIdForLogicalIndex(state, logicalIndex);

    angleRadiansByPieceId[pieceId] = handAngleForLogicalIndex(
      signedAmount,
      delta,
      logicalIndex,
    );
  });

  const activePinSide = activePinSideForState(state);
  for (const pinName of CLOCK_ACTIVE_PINS_BY_MOVE[orientedMove.name]) {
    const pinPressPulse = {
      x: 0,
      y: 0,
      z: -sideSign(activePinSide) * PIN_PRESS_DISTANCE,
    };

    for (const pieceId of [
      `clock-pin-${activePinSide}-${pinName}`,
      `clock-pin-${oppositeSide(activePinSide)}-${pinName}`,
      `clock-pin-post-${pinName}`,
    ]) {
      angleRadiansByPieceId[pieceId] = 0;
      positionPulseByPieceId[pieceId] = pinPressPulse;
    }
    for (const side of [activePinSide, oppositeSide(activePinSide)] as const) {
      colorPulseByStickerId[`clock-pin-${side}-${pinName}-face`] = COLORS.pinPressed;
      colorPulseByStickerId[`clock-pin-${side}-${pinName}-highlight`] = COLORS.pinPressed;
    }
  }

  const affectedPieceIds = Object.keys(angleRadiansByPieceId);
  const firstTurnAngle = Object.values(angleRadiansByPieceId).find((angle) => angle !== 0) ?? 0;
  const durationMultiplier =
    (orientedMove.amount === 0
      ? 0.35
      : Math.max(0.65, Math.min(orientedMove.amount / 3, 1.65))) *
    CLOCK_DURATION_SCALE;

  return {
    affectedPieceIds,
    angleRadians: firstTurnAngle,
    angleRadiansByPieceId,
    axis: { x: 0, y: 0, z: 1 },
    colorPulseByStickerId,
    durationMultiplier,
    move: orientedMove,
    pivot: { x: 0, y: 0, z: 0 },
    positionPulseByPieceId,
    rotateInPlace: true,
  };
};

export const createClockPlayerAdapter = (): PlayerPuzzleAdapter<ClockMove, ClockState> => {
  const definition = createClockDefinition();

  return {
    type: 'clock',
    eventIds: ['clock'],
    parseFormula: definition.parseAlgorithm,
    createInitialState: definition.createSolvedState,
    createRenderableModel: () => CLOCK_MODEL,
    describeMove: (move, state): PlayerMoveAnimation<ClockMove> => {
      if (move.type === 'rotation') {
        const isXRotation = move.axis === 'x';
        const isZRotation = move.axis === 'z';

        return {
          affectedPieceIds: CLOCK_PIECE_IDS,
          angleRadians: isZRotation
            ? (-move.amount * Math.PI) / 2
            : isXRotation
              ? -Math.PI
              : Math.PI,
          axis: isZRotation
            ? { x: 0, y: 0, z: 1 }
            : isXRotation
              ? { x: 1, y: 0, z: 0 }
              : { x: 0, y: 1, z: 0 },
          durationMultiplier: 1.25 * CLOCK_DURATION_SCALE,
          move,
          pivot: { x: 0, y: 0, z: 0 },
        };
      }

      return describeTurnMove(move, state);
    },
    applyMove: definition.applyMove,
  };
};
