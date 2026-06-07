import type { WcaEventId } from '@cubegin/scramble-puzzle';

export type TimerLocale = 'zh-CN' | 'en-US';

export interface WcaEventLabelSet {
  short: string;
  zh: string;
  en: string;
}

export const WCA_EVENT_LABELS: Record<WcaEventId, WcaEventLabelSet> = {
  '333': { short: '3×3×3', zh: '三阶速拧', en: '3×3×3' },
  '222': { short: '2×2×2', zh: '二阶速拧', en: '2×2×2' },
  '444': { short: '4×4×4', zh: '四阶速拧', en: '4×4×4' },
  '555': { short: '5×5×5', zh: '五阶速拧', en: '5×5×5' },
  '666': { short: '6×6×6', zh: '六阶速拧', en: '6×6×6' },
  '777': { short: '7×7×7', zh: '七阶速拧', en: '7×7×7' },
  '333bld': { short: '3×3×3 BLD', zh: '三阶盲拧', en: '3×3×3 BLD' },
  '333fm': { short: '3×3×3 FM', zh: '三阶最少步', en: '3×3×3 FM' },
  '333oh': { short: '3×3×3 OH', zh: '三阶单手', en: '3×3×3 OH' },
  clock: { short: 'Clock', zh: '魔表', en: 'Clock' },
  minx: { short: 'Megaminx', zh: '五魔方', en: 'Megaminx' },
  pyram: { short: 'Pyraminx', zh: '金字塔', en: 'Pyraminx' },
  skewb: { short: 'Skewb', zh: '斜转', en: 'Skewb' },
  sq1: { short: 'Square-1', zh: 'Square-1', en: 'Square-1' },
  '444bld': { short: '4×4×4 BLD', zh: '四阶盲拧', en: '4×4×4 BLD' },
  '555bld': { short: '5×5×5 BLD', zh: '五阶盲拧', en: '5×5×5 BLD' },
  '333mbld': { short: '3×3×3 MBLD', zh: '三阶多盲拧', en: '3×3×3 MBLD' },
};

export const getWcaEventLabel = (
  eventId: WcaEventId,
  locale: TimerLocale = 'zh-CN',
): string => {
  const labels = WCA_EVENT_LABELS[eventId];
  return locale === 'en-US' ? labels.en : labels.zh;
};

export const getWcaEventShortLabel = (eventId: WcaEventId): string =>
  WCA_EVENT_LABELS[eventId].short;
