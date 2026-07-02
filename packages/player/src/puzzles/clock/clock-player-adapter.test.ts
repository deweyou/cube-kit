import { describe, expect, it } from 'vitest';
import { createClockPlayerAdapter } from './clock-player-adapter.js';
import type { PlayerRenderableSticker } from '../puzzle-adapter.js';

const stickerRadius = (sticker: PlayerRenderableSticker): number => {
  const center = {
    x: sticker.polygon.reduce((total, vertex) => total + vertex.x, 0) / sticker.polygon.length,
    y: sticker.polygon.reduce((total, vertex) => total + vertex.y, 0) / sticker.polygon.length,
  };

  return Math.max(
    ...sticker.polygon.map((vertex) => Math.hypot(vertex.x - center.x, vertex.y - center.y)),
  );
};

describe('createClockPlayerAdapter', () => {
  it('parses Clock notation and creates an 18-dial model', () => {
    const adapter = createClockPlayerAdapter();
    const moves = adapter.parseFormula("UR3+ DR2- y2 z U1- z' z2 ALL5-");
    const model = adapter.createRenderableModel(adapter.createInitialState());

    expect(moves).toHaveLength(8);
    expect(model.pieces.filter((piece) => piece.id.startsWith('clock-hand-'))).toHaveLength(18);
    expect(model.pieces.length).toBeGreaterThan(18);
  });

  it('starts Clock with the front face looking at the viewer', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());

    expect(model.cameraOrbit).toEqual({ pitch: 0, yaw: 0 });
  });

  it('uses the original five-circle Clock body without internal border seams', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const frontBoard = model.pieces.find((piece) => piece.id === 'clock-board-front');
    const backBoard = model.pieces.find((piece) => piece.id === 'clock-board-back');
    const boardRim = model.pieces.find((piece) => piece.id === 'clock-board-rim');

    expect(frontBoard).toBeDefined();
    expect(backBoard).toBeDefined();
    expect(boardRim).toBeDefined();
    expect(frontBoard?.position.z).toBeGreaterThan(0.1);
    expect(backBoard?.position.z).toBeLessThan(-0.1);

    const frontBodyStickers =
      frontBoard?.stickers.filter((sticker) => sticker.face === 'front-body') ?? [];
    const frontBodyBorderStickers =
      frontBoard?.stickers.filter((sticker) => sticker.face === 'front-body-border') ?? [];

    expect(frontBodyBorderStickers).toHaveLength(1);
    expect(frontBodyStickers).toHaveLength(5);
    expect(frontBodyStickers.map((sticker) => sticker.id).sort()).toEqual([
      'clock-board-front-center-face',
      'clock-board-front-dl-face',
      'clock-board-front-dr-face',
      'clock-board-front-ul-face',
      'clock-board-front-ur-face',
    ]);

    const stickerCenters = frontBodyStickers.map((sticker) => ({
      id: sticker.id,
      x: sticker.polygon.reduce((total, vertex) => total + vertex.x, 0) / sticker.polygon.length,
      y: sticker.polygon.reduce((total, vertex) => total + vertex.y, 0) / sticker.polygon.length,
    }));

    expect(stickerCenters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'clock-board-front-center-face', x: expect.closeTo(0), y: expect.closeTo(0) }),
        expect.objectContaining({ id: 'clock-board-front-ul-face', x: expect.closeTo(-0.78), y: expect.closeTo(0.78) }),
        expect.objectContaining({ id: 'clock-board-front-ur-face', x: expect.closeTo(0.78), y: expect.closeTo(0.78) }),
        expect.objectContaining({ id: 'clock-board-front-dl-face', x: expect.closeTo(-0.78), y: expect.closeTo(-0.78) }),
        expect.objectContaining({ id: 'clock-board-front-dr-face', x: expect.closeTo(0.78), y: expect.closeTo(-0.78) }),
      ]),
    );
  });

  it('seals the Clock board edge between the front and back faces', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const frontBoard = model.pieces.find((piece) => piece.id === 'clock-board-front');
    const backBoard = model.pieces.find((piece) => piece.id === 'clock-board-back');
    const boardRim = model.pieces.find((piece) => piece.id === 'clock-board-rim');

    expect(frontBoard).toBeDefined();
    expect(backBoard).toBeDefined();
    expect(boardRim).toBeDefined();
    expect(boardRim?.stickers.length).toBeGreaterThan(32);

    const rimZValues = [
      ...new Set(
        boardRim?.stickers.flatMap((sticker) =>
          sticker.polygon.map((vertex) => Number(vertex.z.toFixed(6))),
        ) ?? [],
      ),
    ].sort((left, right) => left - right);

    expect(rimZValues).toEqual([
      Number(backBoard?.position.z.toFixed(6)),
      Number(frontBoard?.position.z.toFixed(6)),
    ]);
  });

  it('renders larger Clock dials and emphasizes the twelve oclock marker', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const dial = model.pieces.find((piece) => piece.id === 'clock-dial-0');
    const face = dial?.stickers.find((sticker) => sticker.id === 'clock-dial-0-face');
    const border = dial?.stickers.find((sticker) => sticker.id === 'clock-dial-0-border');
    const topTick = dial?.stickers.find((sticker) => sticker.id === 'clock-dial-0-tick-0');
    const sideTick = dial?.stickers.find((sticker) => sticker.id === 'clock-dial-0-tick-1');

    expect(face).toBeDefined();
    expect(border).toBeDefined();
    expect(topTick).toBeDefined();
    expect(sideTick).toBeDefined();
    expect(stickerRadius(face as PlayerRenderableSticker)).toBeGreaterThan(0.19);
    expect(stickerRadius(border as PlayerRenderableSticker)).toBeGreaterThan(0.25);
    expect(stickerRadius(topTick as PlayerRenderableSticker)).toBeGreaterThan(
      stickerRadius(sideTick as PlayerRenderableSticker) * 1.5,
    );
  });

  it('mirrors the physical back dial grid so y2 matches the scramble image layout', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const frontUpperLeftDial = model.pieces.find((piece) => piece.id === 'clock-dial-0');
    const backUpperLeftDial = model.pieces.find((piece) => piece.id === 'clock-dial-9');

    expect(frontUpperLeftDial?.position.x).toBeLessThan(0);
    expect(backUpperLeftDial?.position.x).toBeGreaterThan(0);
    expect(backUpperLeftDial?.position.y).toBe(frontUpperLeftDial?.position.y);
  });

  it('rotates affected hands for turn moves', () => {
    const adapter = createClockPlayerAdapter();
    const state = adapter.createInitialState();
    const [move] = adapter.parseFormula('UR3+');
    const animation = adapter.describeMove(move, state);

    expect(animation.affectedPieceIds).toEqual(
      expect.arrayContaining(['clock-hand-1', 'clock-hand-2', 'clock-hand-4', 'clock-hand-5']),
    );
    expect(animation.angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(animation.rotateInPlace).toBe(true);
  });

  it('mirrors hidden-side hand turns so y2 matches the scramble image state', () => {
    const adapter = createClockPlayerAdapter();
    const state = adapter.createInitialState();
    const [move] = adapter.parseFormula('UR3+');
    const animation = adapter.describeMove(move, state);

    expect(animation.angleRadiansByPieceId?.['clock-hand-9']).toBeCloseTo(-Math.PI / 2);
  });

  it('pulses the active Clock pins during turn moves', () => {
    const adapter = createClockPlayerAdapter();
    const state = adapter.createInitialState();
    const [move] = adapter.parseFormula('UR3+');
    const animation = adapter.describeMove(move, state);
    const pinPulse = animation.positionPulseByPieceId?.['clock-pin-front-UR'];

    expect(animation.affectedPieceIds).toContain('clock-pin-front-UR');
    expect(pinPulse?.x).toBe(0);
    expect(pinPulse?.y).toBe(0);
    expect(pinPulse?.z).toBeLessThan(0);
    expect(animation.colorPulseByPieceId?.['clock-pin-post-UR']).toBeUndefined();
    expect(animation.colorPulseByStickerId?.['clock-pin-front-UR-face']).toBe('#d97706');
    expect(animation.colorPulseByStickerId?.['clock-pin-front-UR-highlight']).toBe('#d97706');
    expect(animation.colorPulseByStickerId?.['clock-pin-front-UR-rim']).toBeUndefined();
    expect(animation.colorPulseByStickerId?.['clock-pin-back-UR-face']).toBe('#d97706');
    expect(animation.affectedPieceIds).toEqual(
      expect.arrayContaining(['clock-pin-front-UR', 'clock-pin-back-UR', 'clock-pin-post-UR']),
    );
  });

  it('uses a slower Clock-specific playback duration', () => {
    const adapter = createClockPlayerAdapter();
    const [turn, rotation] = adapter.parseFormula('UR3+ y2');
    const turnAnimation = adapter.describeMove(turn, adapter.createInitialState());
    const rotationAnimation = adapter.describeMove(rotation, adapter.applyMove(adapter.createInitialState(), turn));

    expect(turnAnimation.durationMultiplier).toBeCloseTo(2);
    expect(rotationAnimation.durationMultiplier).toBeCloseTo(2.5);
  });

  it('renders each Clock pin as one post through both sides', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const frontPin = model.pieces.find((piece) => piece.id === 'clock-pin-front-UR');
    const backPin = model.pieces.find((piece) => piece.id === 'clock-pin-back-UR');
    const pinPost = model.pieces.find((piece) => piece.id === 'clock-pin-post-UR');
    const splitPinShafts = model.pieces.filter((piece) => piece.id.startsWith('clock-pin-shaft-'));

    expect(frontPin).toBeDefined();
    expect(backPin).toBeDefined();
    expect(pinPost?.body).toEqual(expect.objectContaining({ type: 'cylinder' }));
    expect(splitPinShafts).toHaveLength(0);
    expect(frontPin?.body).toEqual(expect.objectContaining({ type: 'cylinder' }));
    expect(frontPin?.stickers.length).toBeGreaterThanOrEqual(3);

    const highestStickerZ = Math.max(
      ...(frontPin?.stickers.flatMap((sticker) => sticker.polygon.map((vertex) => vertex.z)) ?? []),
    );

    expect(highestStickerZ).toBeGreaterThan(0.012);
  });

  it('keeps pressed Clock pins above the current face', () => {
    const adapter = createClockPlayerAdapter();
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const [move] = adapter.parseFormula('UR3+');
    const animation = adapter.describeMove(move, adapter.createInitialState());
    const frontBoard = model.pieces.find((piece) => piece.id === 'clock-board-front');
    const frontPin = model.pieces.find((piece) => piece.id === 'clock-pin-front-UR');
    const frontPinBody = frontPin?.body;
    const pinPulse = animation.positionPulseByPieceId?.['clock-pin-front-UR'];

    expect(frontPinBody?.type).toBe('cylinder');
    if (frontPinBody?.type !== 'cylinder' || frontPin === undefined || frontBoard === undefined) {
      throw new Error('Expected front Clock pin and board cylinders in the renderable model.');
    }

    const pressedInnerSurfaceZ = frontPin.position.z + (pinPulse?.z ?? 0) - frontPinBody.depth / 2;

    expect(pressedInnerSurfaceZ).toBeCloseTo(frontBoard.position.z);
  });

  it('maps turns after y2 to the opposite physical side', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation, turn] = adapter.parseFormula('y2 U1-');
    const rotated = adapter.applyMove(adapter.createInitialState(), rotation);
    const animation = adapter.describeMove(turn, rotated);

    expect(animation.affectedPieceIds).toContain('clock-hand-9');
    expect(animation.affectedPieceIds).toContain('clock-hand-11');
  });

  it('maps turns after z to the rotated current face', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation, turn] = adapter.parseFormula('z U1+');
    const rotated = adapter.applyMove(adapter.createInitialState(), rotation);
    const animation = adapter.describeMove(turn, rotated);

    expect(animation.affectedPieceIds).toContain('clock-hand-6');
    expect(animation.affectedPieceIds).not.toContain('clock-hand-2');
    expect(animation.colorPulseByStickerId?.['clock-pin-front-DL-face']).toBe('#d97706');
    expect(animation.colorPulseByStickerId?.['clock-pin-front-UR-face']).toBeUndefined();
  });

  it('animates y2 as a whole Clock body rotation', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation] = adapter.parseFormula('y2');
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const animation = adapter.describeMove(rotation, adapter.createInitialState());

    expect(animation.affectedPieceIds).toHaveLength(model.pieces.length);
    expect(animation.axis).toEqual({ x: 0, y: 1, z: 0 });
    expect(animation.angleRadians).toBeCloseTo(Math.PI);
  });

  it('animates x2 as an upward whole Clock body rotation', () => {
    const adapter = createClockPlayerAdapter();
    const [rotation] = adapter.parseFormula('x2');
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const animation = adapter.describeMove(rotation, adapter.createInitialState());

    expect(animation.affectedPieceIds).toHaveLength(model.pieces.length);
    expect(animation.axis).toEqual({ x: 1, y: 0, z: 0 });
    expect(animation.angleRadians).toBeCloseTo(-Math.PI);
  });

  it('animates z rotations as current-surface turns', () => {
    const adapter = createClockPlayerAdapter();
    const [z, zPrime, z2] = adapter.parseFormula("z z' z2");
    const model = adapter.createRenderableModel(adapter.createInitialState());
    const zAnimation = adapter.describeMove(z, adapter.createInitialState());
    const zPrimeAnimation = adapter.describeMove(zPrime, adapter.createInitialState());
    const z2Animation = adapter.describeMove(z2, adapter.createInitialState());

    expect(zAnimation.affectedPieceIds).toHaveLength(model.pieces.length);
    expect(zAnimation.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(zAnimation.angleRadians).toBeCloseTo(-Math.PI / 2);
    expect(zPrimeAnimation.angleRadians).toBeCloseTo(Math.PI / 2);
    expect(z2Animation.angleRadians).toBeCloseTo(-Math.PI);
  });
});
