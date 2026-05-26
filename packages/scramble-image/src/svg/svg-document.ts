import type { SvgNode } from './svg-elements.js';
import { serializeSvgNode } from './svg-serialize.js';

export const createSvgDocument = (
  width: number,
  height: number,
  children: readonly SvgNode[],
): string => {
  const body = children.map(serializeSvgNode).join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
};
