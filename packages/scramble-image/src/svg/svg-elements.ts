export type SvgElementName = 'rect' | 'circle' | 'path' | 'text' | 'g';

export interface SvgNode {
  name: SvgElementName;
  attrs: Record<string, string | number>;
  children?: readonly SvgNode[];
  text?: string;
}

export const rect = (attrs: Record<string, string | number>): SvgNode => ({ name: 'rect', attrs });

export const circle = (attrs: Record<string, string | number>): SvgNode => ({ name: 'circle', attrs });

export const path = (attrs: Record<string, string | number>): SvgNode => ({ name: 'path', attrs });

export const text = (attrs: Record<string, string | number>, value: string): SvgNode => ({
  name: 'text',
  attrs,
  text: value,
});

export const group = (attrs: Record<string, string | number>, children: readonly SvgNode[]): SvgNode => ({
  name: 'g',
  attrs,
  children,
});
