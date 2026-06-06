import type { ClockState } from '@cubegin/scramble-puzzle';
import { createSvgDocument } from '../svg/svg-document.js';
import { circle, group, path, type SvgNode } from '../svg/svg-elements.js';

const RADIUS = 70;
const CLOCK_RADIUS = 14;
const CLOCK_OUTER_RADIUS = 21;
const POINT_RADIUS = (CLOCK_RADIUS + CLOCK_OUTER_RADIUS) / 2;
const TICK_MARK_RADIUS = 1;
const TOP_TICK_MARK_RADIUS = 2;
const ARROW_HEIGHT = 10;
const ARROW_RADIUS = 2;
const PIN_RADIUS = 4;
const GAP = 5;
const WIDTH = 4 * (RADIUS + GAP);
const HEIGHT = 2 * (RADIUS + GAP);
const ARROW_ANGLE = Math.PI / 2 - Math.acos(ARROW_RADIUS / ARROW_HEIGHT);

const COLORS = {
  front: '#113366',
  frontClock: '#ccddee',
  frontTopClock: '#ffcc44',
  frontHand: '#113366',
  frontPin: '#88aacc',
  back: '#ccddee',
  backClock: '#113366',
  backTopClock: '#cc6600',
  backHand: '#ccddee',
  backPin: '#446699',
  stroke: '#000000',
} as const;

interface SideColors {
  readonly body: string;
  readonly clock: string;
  readonly topClock: string;
  readonly hand: string;
  readonly pin: string;
}

const frontColors: SideColors = {
  body: COLORS.front,
  clock: COLORS.frontClock,
  topClock: COLORS.frontTopClock,
  hand: COLORS.frontHand,
  pin: COLORS.frontPin,
};

const backColors: SideColors = {
  body: COLORS.back,
  clock: COLORS.backClock,
  topClock: COLORS.backTopClock,
  hand: COLORS.backHand,
  pin: COLORS.backPin,
};

const translate = (x: number, y: number): string => `translate(${x} ${y})`;

const clockCenter = (sideIndex: 0 | 1, clockIndex: number): readonly [number, number] => {
  const sideCenterX = (sideIndex * 2 + 1) * (RADIUS + GAP);
  const sideCenterY = RADIUS + GAP;
  const x = sideCenterX + 2 * ((clockIndex % 3) - 1) * CLOCK_OUTER_RADIUS;
  const y = sideCenterY + 2 * (Math.floor(clockIndex / 3) - 1) * CLOCK_OUTER_RADIUS;

  return [x, y];
};

const handPath = (): string => {
  const x = ARROW_RADIUS * Math.cos(ARROW_ANGLE);
  const y = -ARROW_RADIUS * Math.sin(ARROW_ANGLE);

  return `M 0 0 L ${x} ${y} L 0 ${-ARROW_HEIGHT} L ${-x} ${y} Z`;
};

const sideColorFor = (sideIndex: 0 | 1, rightSideUp: boolean): SideColors => {
  if (sideIndex === 0) return rightSideUp ? frontColors : backColors;
  return rightSideUp ? backColors : frontColors;
};

const handColorForClock = (clockIndex: number, rightSideUp: boolean): SideColors => {
  const isBackSide = clockIndex < 9 !== rightSideUp;

  return isBackSide ? backColors : frontColors;
};

const drawSideBackground = (sideIndex: 0 | 1, colors: SideColors): SvgNode[] => {
  const centerX = (sideIndex * 2 + 1) * (RADIUS + GAP);
  const centerY = RADIUS + GAP;
  const nodes: SvgNode[] = [];

  for (const offsetX of [-2 * CLOCK_OUTER_RADIUS, 2 * CLOCK_OUTER_RADIUS]) {
    for (const offsetY of [-2 * CLOCK_OUTER_RADIUS, 2 * CLOCK_OUTER_RADIUS]) {
      nodes.push(
        circle({
          cx: centerX + offsetX,
          cy: centerY + offsetY,
          r: CLOCK_OUTER_RADIUS,
          fill: colors.body,
          stroke: COLORS.stroke,
          'stroke-width': 2,
        }),
      );
    }
  }

  nodes.push(
    circle({
      cx: centerX,
      cy: centerY,
      r: RADIUS,
      fill: colors.body,
      stroke: COLORS.stroke,
      'stroke-width': 2,
    }),
  );

  for (let clock = 0; clock < 9; clock += 1) {
    const [clockX, clockY] = clockCenter(sideIndex, clock);
    const ticks: SvgNode[] = [];

    for (let tick = 0; tick < 12; tick += 1) {
      ticks.push(
        circle({
          cx: 0,
          cy: -POINT_RADIUS,
          r: tick === 0 ? TOP_TICK_MARK_RADIUS : TICK_MARK_RADIUS,
          fill: tick === 0 ? colors.topClock : colors.clock,
          transform: `rotate(${tick * 30})`,
        }),
      );
    }

    nodes.push(
      group({ transform: translate(clockX, clockY) }, [
        circle({
          cx: 0,
          cy: 0,
          r: CLOCK_RADIUS,
          fill: colors.clock,
          stroke: COLORS.stroke,
          'stroke-width': 1,
        }),
        ...ticks,
      ]),
    );
  }

  return nodes;
};

const drawHand = (clockIndex: number, position: number, rightSideUp: boolean): SvgNode => {
  const sideIndex = clockIndex < 9 ? 0 : 1;
  const [x, y] = clockCenter(sideIndex, clockIndex % 9);
  const colors = handColorForClock(clockIndex, rightSideUp);

  return group({ transform: `${translate(x, y)} rotate(${position * 30} 0 0)` }, [
    path({
      d: handPath(),
      fill: colors.hand,
      stroke: colors.hand,
      'stroke-width': 2,
      'stroke-linejoin': 'round',
    }),
    circle({
      cx: 0,
      cy: 0,
      r: ARROW_RADIUS,
      fill: colors.hand,
      stroke: colors.hand,
      'stroke-width': 2,
    }),
  ]);
};

const drawPins = (rightSideUp: boolean): SvgNode[] => {
  const pins: SvgNode[] = [];

  for (const sideIndex of [0, 1] as const) {
    const centerX = (sideIndex * 2 + 1) * (RADIUS + GAP);
    const centerY = RADIUS + GAP;
    const colors =
      sideIndex === 0
        ? rightSideUp
          ? backColors
          : frontColors
        : rightSideUp
          ? frontColors
          : backColors;

    for (const offsetX of [-CLOCK_OUTER_RADIUS, CLOCK_OUTER_RADIUS]) {
      for (const offsetY of [-CLOCK_OUTER_RADIUS, CLOCK_OUTER_RADIUS]) {
        pins.push(
          circle({
            cx: centerX + offsetX,
            cy: centerY + offsetY,
            r: PIN_RADIUS,
            fill: colors.pin,
          }),
        );
      }
    }
  }

  return pins;
};

export const renderClockState = (state: ClockState): string => {
  const nodes: SvgNode[] = [
    ...drawSideBackground(0, sideColorFor(0, state.rightSideUp)),
    ...drawSideBackground(1, sideColorFor(1, state.rightSideUp)),
    ...state.positions.map((position, index) => drawHand(index, position, state.rightSideUp)),
    ...drawPins(state.rightSideUp),
  ];

  return createSvgDocument(WIDTH, HEIGHT, nodes);
};
