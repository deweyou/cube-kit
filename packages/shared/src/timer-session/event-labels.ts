import type { WcaEventId } from '../wca';

export type TimerLocale = 'zh-CN' | 'en-US';

export interface WcaEventLabelSet {
  short: string;
  zh: string;
  en: string;
}

export const WCA_EVENT_LABELS: Record<WcaEventId, WcaEventLabelSet> = {
  '333': { short: '3x3x3', zh: '三阶速拧', en: '3x3x3' },
  '222': { short: '2x2x2', zh: '二阶速拧', en: '2x2x2' },
  '444': { short: '4x4x4', zh: '四阶速拧', en: '4x4x4' },
  '555': { short: '5x5x5', zh: '五阶速拧', en: '5x5x5' },
  '666': { short: '6x6x6', zh: '六阶速拧', en: '6x6x6' },
  '777': { short: '7x7x7', zh: '七阶速拧', en: '7x7x7' },
  '333bld': { short: '3x3x3 BLD', zh: '三阶盲拧', en: '3x3x3 BLD' },
  '333fm': { short: '3x3x3 FM', zh: '三阶最少步', en: '3x3x3 FM' },
  '333oh': { short: '3x3x3 OH', zh: '三阶单手', en: '3x3x3 OH' },
  clock: { short: 'Clock', zh: '魔表', en: 'Clock' },
  minx: { short: 'Megaminx', zh: '五魔方', en: 'Megaminx' },
  pyram: { short: 'Pyraminx', zh: '金字塔', en: 'Pyraminx' },
  skewb: { short: 'Skewb', zh: '斜转', en: 'Skewb' },
  sq1: { short: 'Square-1', zh: 'Square-1', en: 'Square-1' },
  '444bld': { short: '4x4x4 BLD', zh: '四阶盲拧', en: '4x4x4 BLD' },
  '555bld': { short: '5x5x5 BLD', zh: '五阶盲拧', en: '5x5x5 BLD' },
  '333mbld': { short: '3x3x3 MBLD', zh: '三阶多盲', en: '3x3x3 MBLD' },
};

export const getWcaEventLabel = (eventId: WcaEventId, locale: TimerLocale = 'zh-CN'): string => {
  const labels = WCA_EVENT_LABELS[eventId];
  return locale === 'en-US' ? labels.en : labels.zh;
};

export const getWcaEventShortLabel = (eventId: WcaEventId): string =>
  WCA_EVENT_LABELS[eventId].short;
