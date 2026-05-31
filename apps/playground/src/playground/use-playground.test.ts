import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePlayground } from './use-playground';

describe('usePlayground', () => {
  it('generates a batch and selects the first scramble', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.scrambles).toHaveLength(2);
    expect(result.current.selectedScramble?.id).toBe('333-1');
    expect(result.current.svg).toContain('<svg');
    expect(result.current.generationError).toBeUndefined();
  });

  it('renders manual text without replacing generated scrambles', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.generate();
    });
    act(() => {
      result.current.setManualScramble("R U R' U'");
    });
    act(() => {
      result.current.renderManual();
    });

    expect(result.current.scrambles).toHaveLength(2);
    expect(result.current.manualSvg).toBe('<svg>manual</svg>');
  });

  it('auto-generates a solver scramble when changing solver event', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.setSolverEventId('222');
    });

    expect(result.current.solverEventId).toBe('222');
    expect(result.current.solverScramble).toBe('222-scramble');
    expect(result.current.solverMethods).toEqual(['222-face']);
    expect(result.current.solverTargetText).toBe('D');
  });
});

const fakeService = () => ({
  async generate() {
    return {
      scrambles: [
        { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
        { id: '333-2', eventId: '333' as const, scramble: 'F2 U2' },
      ],
      selectedScramble: { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
      svg: '<svg>generated</svg>',
      generation: { durationMs: 1, count: 2 },
      render: { durationMs: 2, scrambleLength: 9, svgBytes: 20 },
    };
  },
  renderManual() {
    return {
      svg: '<svg>manual</svg>',
      render: { durationMs: 3, scrambleLength: 9, svgBytes: 17 },
      error: undefined,
    };
  },
  async generateSolverScramble(eventId: '333' | '222' | 'sq1' | 'pyram') {
    return {
      eventId,
      scramble: `${eventId}-scramble`,
      error: undefined,
    };
  },
  solvePuzzleAssist() {
    return {
      results: [],
      diagnostics: { durationMs: 1, resultCount: 0 },
      error: undefined,
    };
  },
});
