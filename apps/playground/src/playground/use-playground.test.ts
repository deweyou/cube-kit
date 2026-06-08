import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  PlaygroundFullSolverInput,
  PlaygroundGenerateInput,
  PlaygroundManualRenderInput,
} from './types';
import { usePlayground } from './use-playground';

describe('usePlayground', () => {
  it('generates a batch and selects the first scramble', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.scrambles).toHaveLength(2);
    expect(result.current.selectedScramble?.id).toBe('333-1');
    expect(result.current.svg).toBe('<svg>generated-net</svg>');
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
    expect(result.current.manualSvg).toBe('<svg>manual-net</svg>');
  });

  it('rerenders the selected and manual scramble when the image view changes', async () => {
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
    act(() => {
      result.current.setImageView('isometric');
    });

    expect(result.current.imageView).toBe('isometric');
    expect(result.current.svg).toBe('<svg>manual-isometric</svg>');
    expect(result.current.manualSvg).toBe('<svg>manual-isometric</svg>');
    expect(result.current.generationResult?.render.svgBytes).toBe(31);
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

  it('sets Skewb Face as the default Skewb helper', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.setSolverEventId('skewb');
    });

    expect(result.current.solverEventId).toBe('skewb');
    expect(result.current.solverScramble).toBe('skewb-scramble');
    expect(result.current.solverMethods).toEqual(['skewb-face']);
    expect(result.current.solverTargetText).toBe('D');
  });

  it('switches to full solver mode and stores full solve results', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.setSolverMode('full');
    });
    await act(async () => {
      await result.current.setSolverEventId('clock');
    });
    act(() => {
      result.current.solvePuzzleFull();
    });

    expect(result.current.solverMode).toBe('full');
    expect(result.current.solverEventId).toBe('clock');
    expect(result.current.solverScramble).toBe('clock-scramble');
    expect(result.current.fullSolverResult?.result?.engine).toBe('clock-inverse');
  });
});

const fakeService = () => ({
  async generate(input: PlaygroundGenerateInput) {
    return {
      scrambles: [
        { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
        { id: '333-2', eventId: '333' as const, scramble: 'F2 U2' },
      ],
      selectedScramble: { id: '333-1', eventId: '333' as const, scramble: "R U R' U'" },
      svg: `<svg>generated-${input.imageView}</svg>`,
      generation: { durationMs: 1, count: 2 },
      render: { durationMs: 2, scrambleLength: 9, svgBytes: 20 },
    };
  },
  renderManual(input: PlaygroundManualRenderInput) {
    return {
      svg: `<svg>manual-${input.imageView}</svg>`,
      render: { durationMs: 3, scrambleLength: input.scramble.length, svgBytes: 31 },
      error: undefined,
    };
  },
  async generateSolverScramble(
    eventId: '333' | '444' | '222' | 'sq1' | 'pyram' | 'skewb' | 'clock',
  ) {
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
  solvePuzzleFull(input: PlaygroundFullSolverInput) {
    return {
      result: {
        eventId: input.eventId,
        scramble: input.scramble,
        solution: "UR1- y2 DR1+",
        moveCount: 2,
        engine: 'clock-inverse' as const,
      },
      diagnostics: { durationMs: 2, resultCount: 1 },
      error: undefined,
    };
  },
});
