import type { SvgNode } from './svg-elements.js';

const escapeAttr = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export const serializeSvgNode = (node: SvgNode): string => {
  const textValue = node.attrs['data-text'];
  const attrs = Object.entries(node.attrs)
    .filter(([key]) => key !== 'data-text')
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');
  const children = node.children?.map(serializeSvgNode).join('') ?? '';
  const text = textValue === undefined ? '' : escapeAttr(textValue);

  return `<${node.name}${attrs}>${children}${text}</${node.name}>`;
};
