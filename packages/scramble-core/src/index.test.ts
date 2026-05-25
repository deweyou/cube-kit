import { describe, expect, it, vi } from 'vitest';

describe('scramble-core entrypoint', () => {
  it('does not allocate threephase tables on root import', async () => {
    vi.resetModules();

    await import('./index.js');
    const [{ Center1, Center2, Center3 }, { Edge3 }] = await Promise.all([
      import('./solvers/threephase/center.js'),
      import('./solvers/threephase/edge.js'),
    ]);

    expect(Center1.ctsmv).toHaveLength(0);
    expect(Center2.ctmv).toHaveLength(0);
    expect(Center3.ctmove).toHaveLength(0);
    expect(Edge3.eprun).toHaveLength(0);
  });
});
