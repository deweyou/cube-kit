import { act, renderHook } from '@testing-library/react';
import type { EventId } from '@cubegin/shared/events';
import { getScrambleTypeDefinition } from '@cubegin/scramble-core';
import { describe, expect, it } from 'vitest';
import type {
  PlaygroundFullSolverInput,
  PlaygroundGenerateInput,
  PlaygroundManualRenderInput,
  PlaygroundSolverComparisonInput,
  PlaygroundSolverInput,
} from './types';
import { type PlaygroundService, usePlayground } from './use-playground';

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

  it('routes a selected training type and parsed case options to the service', async () => {
    let generationInput: PlaygroundGenerateInput | undefined;
    const service = fakeService();
    const { result } = renderHook(() =>
      usePlayground({
        service: {
          ...service,
          async generate(input) {
            generationInput = input;
            return await service.generate(input);
          },
        },
      }),
    );

    act(() => {
      result.current.setScrambleTypeId('333.pll');
      result.current.setCaseSelectionMode('natural');
      result.current.setEnabledCaseIdsText('333.pll.aa, 333.pll.ab');
    });
    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.eventId).toBe('333');
    expect(result.current.scrambleTypeDefinition).toEqual(getScrambleTypeDefinition('333.pll'));
    expect(generationInput).toEqual({
      scrambleTypeId: '333.pll',
      count: 5,
      multiBlindCubeCount: 3,
      imageView: 'net',
      enabledCaseIds: ['333.pll.aa', '333.pll.ab'],
      mode: 'natural',
    });
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

  it('previews the first Assist solution and updates the result image when selected', () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    act(() => {
      result.current.solvePuzzleAssist();
    });

    expect(result.current.selectedSolverSolution?.target).toBe('D');
    expect(result.current.solverComparison?.solutionFormula).toBe("R U R' U' y R");

    const alternateSolution = result.current.solverResult?.results[0]?.solutions[1];
    expect(alternateSolution).toBeTruthy();

    act(() => {
      if (alternateSolution) result.current.selectSolverSolution(alternateSolution);
    });

    expect(result.current.selectedSolverSolution?.target).toBe('U');
    expect(result.current.solverComparison?.solutionFormula).toBe("R U R' U' x F");
  });

  it('auto-generates a player scramble when changing player event', async () => {
    const { result } = renderHook(() => usePlayground({ service: fakeService() }));

    await act(async () => {
      await result.current.setPlayerDraftEventId('minx');
    });
    expect(result.current.playerEventId).toBe('minx');
    expect(result.current.playerFormula).toBe('minx-player-scramble');
    expect(result.current.playerSvg).toBe('<svg>player-minx-net</svg>');

    act(() => {
      result.current.loadPlayerFormula();
    });

    expect(result.current.playerDraftEventId).toBe('minx');
    expect(result.current.playerDraftFormula).toBe('minx-player-scramble');
    expect(result.current.playerEventId).toBe('minx');
    expect(result.current.playerFormula).toBe('minx-player-scramble');
    expect(result.current.playerSvg).toBe('<svg>manual-net</svg>');
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
    expect(result.current.solverComparison?.solutionFormula).toBe('clock-scramble UR1- y2 DR1+');
  });
});

const fakeService = (): PlaygroundService => ({
  async generate(input: PlaygroundGenerateInput) {
    const definition = getScrambleTypeDefinition(input.scrambleTypeId);
    const selectedScramble = {
      id: `${input.scrambleTypeId}-1`,
      scrambleTypeId: input.scrambleTypeId,
      eventId: definition.baseEventId,
      scramble: "R U R' U'",
      ...(input.enabledCaseIds?.[0] === undefined ? {} : { caseId: input.enabledCaseIds[0] }),
    };

    return {
      scrambles: [
        selectedScramble,
        {
          id: `${input.scrambleTypeId}-2`,
          scrambleTypeId: input.scrambleTypeId,
          eventId: definition.baseEventId,
          scramble: 'F2 U2',
        },
      ],
      selectedScramble,
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
  renderSolverComparison(input: PlaygroundSolverComparisonInput) {
    const solutionFormula = [input.scramble, input.setupRotation, input.solution]
      .filter(Boolean)
      .join(' ');

    return {
      scrambleSvg: '<svg>scrambled</svg>',
      solutionSvg: `<svg>${solutionFormula}</svg>`,
      solutionFormula,
      error: undefined,
    };
  },
  async generateSolverScramble(eventId) {
    return {
      eventId,
      scramble: `${eventId}-scramble`,
      error: undefined,
    };
  },
  async generatePlayerScramble(eventId: EventId, imageView = 'net') {
    return {
      eventId,
      scramble: `${eventId}-player-scramble`,
      svg: `<svg>player-${eventId}-${imageView}</svg>`,
      render: { durationMs: 4, scrambleLength: `${eventId}-player-scramble`.length, svgBytes: 32 },
      error: undefined,
    };
  },
  solvePuzzleAssist(input: PlaygroundSolverInput) {
    return {
      results: [
        {
          method: input.methods[0] ?? 'cross',
          scramble: input.scramble,
          solutions: [
            {
              method: input.methods[0] ?? 'cross',
              target: 'D',
              targetLabel: 'D face',
              setupRotation: 'y',
              solution: 'R',
              depth: 1,
              metric: { ftm: 1, qtm: 1 },
            },
            {
              method: input.methods[0] ?? 'cross',
              target: 'U',
              targetLabel: 'U face',
              setupRotation: 'x',
              solution: 'F',
              depth: 1,
              metric: { ftm: 1, qtm: 1 },
            },
          ],
        },
      ],
      diagnostics: { durationMs: 1, resultCount: 2 },
      error: undefined,
    };
  },
  solvePuzzleFull(input: PlaygroundFullSolverInput) {
    return {
      result: {
        eventId: input.eventId,
        scramble: input.scramble,
        solution: 'UR1- y2 DR1+',
        moveCount: 2,
        engine: 'clock-inverse' as const,
      },
      diagnostics: { durationMs: 2, resultCount: 1 },
      error: undefined,
    };
  },
});
