import { EVENT_IDS, EVENT_INFO, type EventId, type PuzzleId } from '@cubegin/shared/events';
import type { TrainingOrientationTarget } from './training-orientation.js';

const ERROR_PREFIX = '@cubegin/scramble-core';

export const TRAINING_SCRAMBLE_TYPE_IDS = [
  '222.cll',
  '222.eg1',
  '222.eg2',
  '222.pbl',
  '222.tcll_plus',
  '222.tcll_minus',
  '222.ls',
  '222.no_bar',
  '222.teg1',
  '222.teg2',
  '333.edges_only',
  '333.corners_only',
  '333.ll',
  '333.pll',
  '333.oll',
  '333.lsll',
  '333.zbll',
  '333.coll',
  '333.cll',
  '333.ell',
  '333.2gll',
  '333.zzll',
  '333.zbls',
  '333.eols',
  '333.wvls',
  '333.vls',
  '333.f2l',
  '333.easy_cross',
  '333.easy_xcross',
  '333.eoline',
  '333.eo_cross',
  '333.edge_permutation',
  '333.edge_orientation',
  '333.corner_permutation',
  '333.corner_orientation',
  '333.permutation_only',
  '333.orientation_only',
  '333.three_edge_cycle',
  '333.three_corner_cycle',
  '333.roux.second_block',
  '333.roux.cmll',
  '333.roux.lse',
  '333.roux.lse_mu',
  '333.mehta.3qb',
  '333.mehta.eole',
  '333.mehta.tdr',
  '333.mehta.6cp',
  '333.mehta.cdrll',
  '333.mehta.l5ep',
  '333.mehta.ttll',
  '333.subset.ru',
  '333.subset.lu',
  '333.subset.fru',
  '333.subset.rul',
  '333.subset.rrwu',
  '333.subset.mu',
  '333.subset.half_turn',
  '333.subset.domino',
  '444.edge_pairing',
  '444.subset.rruu',
  '444.ll',
  '444.ell',
  '444.edges_only',
  '444.centers_only',
  '444.yau.ud_centers',
  '444.yau.ud_3_edges',
  '444.yau.last_8_dedges',
  '444.hoya.rl_centers',
  '444.hoya.rldx_centers',
  '444.hoya.rldx_cross',
  '444.poll',
  '444.ppll',
  '555.edge_pairing',
  '666.edge_pairing',
  '777.edge_pairing',
  'minx.subset.ru',
  'minx.s2l',
  'minx.lsll',
  'minx.pll',
  'minx.ll',
  'pyram.l4e',
  'pyram.four_tips',
  'pyram.no_bar',
  'skewb.l2l',
  'skewb.no_bar',
  'sq1.cube_shape',
  'sq1.csp',
  'sq1.pbl',
  'fto.l3t',
  'fto.l3t_lbt',
  'fto.tcp',
  'fto.edges_only',
  'fto.centers_only',
  'fto.corners_only',
] as const;

export type TrainingScrambleTypeId = (typeof TRAINING_SCRAMBLE_TYPE_IDS)[number];
export type ScrambleTypeId = EventId | TrainingScrambleTypeId;

export type ScrambleCategoryId =
  | 'official'
  | '222'
  | '333.cfop'
  | '333.state'
  | '333.roux'
  | '333.mehta'
  | '333.subset'
  | '444'
  | 'big-cube'
  | 'minx'
  | 'pyram'
  | 'skewb'
  | 'sq1'
  | 'fto';

export type ScrambleGeneratorKind =
  | 'random-state'
  | 'case-state'
  | 'subgroup'
  | 'template'
  | 'random-turn';

export interface ScrambleTypeDefinition {
  readonly id: ScrambleTypeId;
  readonly baseEventId: EventId;
  readonly puzzleId: PuzzleId;
  readonly categoryId: ScrambleCategoryId;
  readonly kind: 'official' | 'training' | 'subset';
  readonly generatorKind: ScrambleGeneratorKind;
  readonly caseSetId?: string;
  readonly orientationTarget?: TrainingOrientationTarget;
}

type TrainingDefinitionSpec = readonly [
  id: TrainingScrambleTypeId,
  generatorKind: ScrambleGeneratorKind,
  caseSetId?: string,
  orientationTarget?: TrainingOrientationTarget,
];

const CASE_STATE = 'case-state';
const RANDOM_STATE = 'random-state';
const SUBGROUP = 'subgroup';
const TEMPLATE = 'template';
const BOTTOM_LAYER = 'bottom-layer';
const COMPLETE_FACE = 'complete-face';

const TRAINING_DEFINITION_GROUPS: readonly {
  baseEventId: EventId;
  puzzleId: PuzzleId;
  categoryId: Exclude<ScrambleCategoryId, 'official'>;
  definitions: readonly TrainingDefinitionSpec[];
}[] = [
  {
    baseEventId: '222',
    puzzleId: 'cube',
    categoryId: '222',
    definitions: [
      ['222.cll', CASE_STATE, '222.cll', BOTTOM_LAYER],
      ['222.eg1', CASE_STATE, '222.eg1', BOTTOM_LAYER],
      ['222.eg2', CASE_STATE, '222.eg2', BOTTOM_LAYER],
      ['222.pbl', CASE_STATE, '222.pbl', BOTTOM_LAYER],
      ['222.tcll_plus', CASE_STATE, '222.tcll_plus', BOTTOM_LAYER],
      ['222.tcll_minus', CASE_STATE, '222.tcll_minus', BOTTOM_LAYER],
      ['222.ls', CASE_STATE, '222.ls', BOTTOM_LAYER],
      ['222.no_bar', RANDOM_STATE],
      ['222.teg1', CASE_STATE, '222.teg1', BOTTOM_LAYER],
      ['222.teg2', CASE_STATE, '222.teg2', BOTTOM_LAYER],
    ],
  },
  {
    baseEventId: '333',
    puzzleId: 'cube',
    categoryId: '333.cfop',
    definitions: [
      ['333.edges_only', RANDOM_STATE],
      ['333.corners_only', RANDOM_STATE],
      ['333.ll', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.pll', CASE_STATE, '333.pll', BOTTOM_LAYER],
      ['333.oll', CASE_STATE, '333.oll', BOTTOM_LAYER],
      ['333.lsll', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.zbll', CASE_STATE, '333.zbll', BOTTOM_LAYER],
      ['333.coll', CASE_STATE, '333.coll', BOTTOM_LAYER],
      ['333.cll', CASE_STATE, '333.cll', BOTTOM_LAYER],
      ['333.ell', CASE_STATE, '333.ell', BOTTOM_LAYER],
      ['333.2gll', CASE_STATE, '333.2gll', BOTTOM_LAYER],
      ['333.zzll', CASE_STATE, '333.zzll', BOTTOM_LAYER],
      ['333.zbls', CASE_STATE, '333.zbls', BOTTOM_LAYER],
      ['333.eols', CASE_STATE, '333.eols', BOTTOM_LAYER],
      ['333.wvls', CASE_STATE, '333.wvls', BOTTOM_LAYER],
      ['333.vls', CASE_STATE, '333.vls', BOTTOM_LAYER],
      ['333.f2l', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.easy_cross', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.easy_xcross', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.eoline', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['333.eo_cross', RANDOM_STATE, undefined, BOTTOM_LAYER],
    ],
  },
  {
    baseEventId: '333',
    puzzleId: 'cube',
    categoryId: '333.state',
    definitions: [
      ['333.edge_permutation', RANDOM_STATE],
      ['333.edge_orientation', RANDOM_STATE],
      ['333.corner_permutation', RANDOM_STATE],
      ['333.corner_orientation', RANDOM_STATE],
      ['333.permutation_only', RANDOM_STATE],
      ['333.orientation_only', RANDOM_STATE],
      ['333.three_edge_cycle', CASE_STATE, '333.three_edge_cycle'],
      ['333.three_corner_cycle', CASE_STATE, '333.three_corner_cycle'],
    ],
  },
  {
    baseEventId: '333',
    puzzleId: 'cube',
    categoryId: '333.roux',
    definitions: [
      ['333.roux.second_block', RANDOM_STATE],
      ['333.roux.cmll', CASE_STATE, '333.roux.cmll'],
      ['333.roux.lse', RANDOM_STATE],
      ['333.roux.lse_mu', SUBGROUP],
    ],
  },
  {
    baseEventId: '333',
    puzzleId: 'cube',
    categoryId: '333.mehta',
    definitions: [
      ['333.mehta.3qb', RANDOM_STATE],
      ['333.mehta.eole', RANDOM_STATE],
      ['333.mehta.tdr', RANDOM_STATE],
      ['333.mehta.6cp', CASE_STATE, '333.mehta.6cp'],
      ['333.mehta.cdrll', CASE_STATE, '333.mehta.cdrll'],
      ['333.mehta.l5ep', CASE_STATE, '333.mehta.l5ep'],
      ['333.mehta.ttll', CASE_STATE, '333.mehta.ttll'],
    ],
  },
  {
    baseEventId: '333',
    puzzleId: 'cube',
    categoryId: '333.subset',
    definitions: [
      ['333.subset.ru', SUBGROUP],
      ['333.subset.lu', SUBGROUP],
      ['333.subset.fru', SUBGROUP],
      ['333.subset.rul', SUBGROUP],
      ['333.subset.rrwu', SUBGROUP],
      ['333.subset.mu', SUBGROUP],
      ['333.subset.half_turn', SUBGROUP],
      ['333.subset.domino', SUBGROUP],
    ],
  },
  {
    baseEventId: '444',
    puzzleId: 'cube',
    categoryId: '444',
    definitions: [
      ['444.edge_pairing', TEMPLATE],
      ['444.subset.rruu', SUBGROUP],
      ['444.ll', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['444.ell', RANDOM_STATE, undefined, BOTTOM_LAYER],
      ['444.edges_only', RANDOM_STATE],
      ['444.centers_only', RANDOM_STATE],
      ['444.yau.ud_centers', RANDOM_STATE],
      ['444.yau.ud_3_edges', RANDOM_STATE],
      ['444.yau.last_8_dedges', RANDOM_STATE],
      ['444.hoya.rl_centers', RANDOM_STATE],
      ['444.hoya.rldx_centers', RANDOM_STATE],
      ['444.hoya.rldx_cross', RANDOM_STATE],
      ['444.poll', CASE_STATE, '444.poll', BOTTOM_LAYER],
      ['444.ppll', CASE_STATE, '444.ppll', BOTTOM_LAYER],
    ],
  },
  {
    baseEventId: '555',
    puzzleId: 'cube',
    categoryId: 'big-cube',
    definitions: [['555.edge_pairing', TEMPLATE]],
  },
  {
    baseEventId: '666',
    puzzleId: 'cube',
    categoryId: 'big-cube',
    definitions: [['666.edge_pairing', TEMPLATE]],
  },
  {
    baseEventId: '777',
    puzzleId: 'cube',
    categoryId: 'big-cube',
    definitions: [['777.edge_pairing', TEMPLATE]],
  },
  {
    baseEventId: 'minx',
    puzzleId: 'megaminx',
    categoryId: 'minx',
    definitions: [
      ['minx.subset.ru', SUBGROUP],
      ['minx.s2l', SUBGROUP],
      ['minx.lsll', CASE_STATE, 'minx.lsll'],
      ['minx.pll', CASE_STATE, 'minx.pll'],
      ['minx.ll', CASE_STATE, 'minx.ll'],
    ],
  },
  {
    baseEventId: 'pyram',
    puzzleId: 'pyraminx',
    categoryId: 'pyram',
    definitions: [
      ['pyram.l4e', CASE_STATE, 'pyram.l4e'],
      ['pyram.four_tips', RANDOM_STATE],
      ['pyram.no_bar', RANDOM_STATE],
    ],
  },
  {
    baseEventId: 'skewb',
    puzzleId: 'skewb',
    categoryId: 'skewb',
    definitions: [
      ['skewb.l2l', CASE_STATE, 'skewb.l2l', COMPLETE_FACE],
      ['skewb.no_bar', RANDOM_STATE],
    ],
  },
  {
    baseEventId: 'sq1',
    puzzleId: 'square1',
    categoryId: 'sq1',
    definitions: [
      ['sq1.cube_shape', RANDOM_STATE],
      ['sq1.csp', CASE_STATE, 'sq1.csp'],
      ['sq1.pbl', CASE_STATE, 'sq1.pbl'],
    ],
  },
  {
    baseEventId: 'fto',
    puzzleId: 'face-turning-octahedron',
    categoryId: 'fto',
    definitions: [
      ['fto.l3t', CASE_STATE, 'fto.l3t'],
      ['fto.l3t_lbt', CASE_STATE, 'fto.l3t_lbt'],
      ['fto.tcp', CASE_STATE, 'fto.tcp'],
      ['fto.edges_only', RANDOM_STATE],
      ['fto.centers_only', RANDOM_STATE],
      ['fto.corners_only', RANDOM_STATE],
    ],
  },
];

const OFFICIAL_RANDOM_TURN_EVENTS = new Set<EventId>(['555', '666', '777', 'minx', 'fto']);
const OFFICIAL_TEMPLATE_EVENTS = new Set<EventId>(['333bld', '333fm', '444bld', '555bld']);

const officialDefinition = (eventId: EventId): ScrambleTypeDefinition => ({
  id: eventId,
  baseEventId: eventId,
  puzzleId: EVENT_INFO[eventId].puzzleId,
  categoryId: 'official',
  kind: 'official',
  generatorKind: OFFICIAL_RANDOM_TURN_EVENTS.has(eventId)
    ? 'random-turn'
    : OFFICIAL_TEMPLATE_EVENTS.has(eventId)
      ? 'template'
      : 'random-state',
});

const trainingDefinitions = (): readonly ScrambleTypeDefinition[] =>
  TRAINING_DEFINITION_GROUPS.flatMap(({ baseEventId, puzzleId, categoryId, definitions }) =>
    definitions.map(([id, generatorKind, caseSetId, orientationTarget]) => ({
      id,
      baseEventId,
      puzzleId,
      categoryId,
      kind: categoryId === '333.subset' || id === '444.subset.rruu' ? 'subset' : 'training',
      generatorKind,
      ...(caseSetId === undefined ? {} : { caseSetId }),
      ...(orientationTarget === undefined ? {} : { orientationTarget }),
    })),
  );

const definitions = [...EVENT_IDS.map(officialDefinition), ...trainingDefinitions()];

export const SCRAMBLE_TYPE_IDS = Object.freeze([
  ...EVENT_IDS,
  ...TRAINING_SCRAMBLE_TYPE_IDS,
] as const);

export const SCRAMBLE_TYPE_CATALOG = Object.freeze(
  Object.fromEntries(definitions.map((definition) => [definition.id, Object.freeze(definition)])),
) as Readonly<Record<ScrambleTypeId, ScrambleTypeDefinition>>;

export const getScrambleTypeDefinition = (id: string): ScrambleTypeDefinition => {
  const definition = SCRAMBLE_TYPE_CATALOG[id as ScrambleTypeId];
  if (definition === undefined) {
    throw new Error(`${ERROR_PREFIX}: unknown scramble type '${id}'`);
  }

  return definition;
};
