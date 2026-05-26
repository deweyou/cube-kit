import type { SvgElementName, SvgNode } from './svg-elements.js';

const ERROR_PREFIX = '@cubekit/scramble-image';
const SUPPORTED_ELEMENT_NAMES = new Set<SvgElementName>(['rect', 'circle', 'path', 'text', 'g']);
const SVG_NAME_PATTERN = /^[A-Za-z_:][A-Za-z0-9_.:-]*$/;

const escapeAttr = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const assertValidElementName: (name: string) => asserts name is SvgElementName = (name) => {
  if (!SUPPORTED_ELEMENT_NAMES.has(name as SvgElementName)) {
    throw new Error(`${ERROR_PREFIX}: invalid SVG element name '${name}'`);
  }
};

const assertValidAttrName: (name: string) => void = (name) => {
  if (!SVG_NAME_PATTERN.test(name)) {
    throw new Error(`${ERROR_PREFIX}: invalid SVG attribute name '${name}'`);
  }
};

export const serializeSvgNode = (node: SvgNode): string => {
  assertValidElementName(node.name);

  const attrs = Object.entries(node.attrs)
    .map(([key, value]) => {
      assertValidAttrName(key);

      return ` ${key}="${escapeAttr(value)}"`;
    })
    .join('');
  const children = node.children?.map(serializeSvgNode).join('') ?? '';
  const text = node.text === undefined ? '' : escapeAttr(node.text);

  return `<${node.name}${attrs}>${children}${text}</${node.name}>`;
};
