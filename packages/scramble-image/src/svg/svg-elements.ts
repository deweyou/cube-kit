export interface SvgNode {
  name: string;
  attrs: Record<string, string | number>;
  children?: readonly SvgNode[];
}

export const rect = (attrs: Record<string, string | number>): SvgNode => ({ name: 'rect', attrs });

export const circle = (attrs: Record<string, string | number>): SvgNode => ({ name: 'circle', attrs });

export const path = (attrs: Record<string, string | number>): SvgNode => ({ name: 'path', attrs });

export const text = (attrs: Record<string, string | number>, value: string): SvgNode => ({
  name: 'text',
  attrs: { ...attrs, 'data-text': value },
});

export const group = (attrs: Record<string, string | number>, children: readonly SvgNode[]): SvgNode => ({
  name: 'g',
  attrs,
  children,
});
