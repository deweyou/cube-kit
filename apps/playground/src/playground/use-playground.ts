import { useMemo, useState } from 'react';
import type { EventId } from '@cubegin/shared/events';
import {
  getScrambleTypeDefinition,
  type CaseSelectionOptions,
  type ScrambleTypeId,
} from '@cubegin/scramble-core';
import type {
  PuzzleAssistEventId,
  PuzzleAssistMethod,
  PuzzleAssistSolution,
  PuzzleFullEventId,
} from '@cubegin/solver';
import { getBrowserSeed } from './browser-seed';
import { createPlaygroundService } from './playground-service';
import type {
  PlaygroundFullSolverResult,
  PlaygroundGenerateResult,
  PlaygroundImageView,
  PlaygroundManualRenderResult,
  PlaygroundScramble,
  PlaygroundSolverComparison,
  PlaygroundSolverResult,
} from './types';

export type PlaygroundPage = 'scrambles' | 'solvers' | 'player' | 'icons';
export type PlaygroundSolverMode = 'assist' | 'full';
export type PlaygroundService = ReturnType<typeof createPlaygroundService>;

const ASSIST_SOLVER_EVENT_IDS = ['333', '222', 'sq1', 'pyram', 'skewb'] as const;

const DEFAULT_SOLVER_METHODS = {
  '333': ['cross'],
  '222': ['222-face'],
  sq1: ['sq1-shape-ftm'],
  pyram: ['pyraminx-v'],
  skewb: ['skewb-face'],
} satisfies Record<PuzzleAssistEventId, readonly PuzzleAssistMethod[]>;

const DEFAULT_SOLVER_TARGET_TEXT = {
  '333': '',
  '222': 'D',
  sq1: 'shape',
  pyram: 'D',
  skewb: 'D',
} satisfies Record<PuzzleAssistEventId, string>;

export interface UsePlaygroundOptions {
  readonly service?: PlaygroundService;
}

export const usePlayground = ({ service }: UsePlaygroundOptions = {}) => {
  const packageService = useMemo(
    () => service ?? createPlaygroundService({ seed: getBrowserSeed() }),
    [service],
  );
  const [scrambleTypeId, setScrambleTypeIdState] = useState<ScrambleTypeId>('333');
  const scrambleTypeDefinition = useMemo(
    () => getScrambleTypeDefinition(scrambleTypeId),
    [scrambleTypeId],
  );
  const eventId = scrambleTypeDefinition.baseEventId;
  const [caseSelectionMode, setCaseSelectionMode] =
    useState<NonNullable<CaseSelectionOptions['mode']>>('uniform');
  const [enabledCaseIdsText, setEnabledCaseIdsText] = useState('');
  const [count, setCount] = useState(5);
  const [multiBlindCubeCount, setMultiBlindCubeCount] = useState(3);
  const [imageView, setImageViewState] = useState<PlaygroundImageView>('net');
  const [scrambles, setScrambles] = useState<readonly PlaygroundScramble[]>([]);
  const [selectedScramble, setSelectedScramble] = useState<PlaygroundScramble | undefined>();
  const [selectedScrambleIndex, setSelectedScrambleIndex] = useState(0);
  const [svg, setSvg] = useState('');
  const [manualScramble, setManualScramble] = useState('');
  const [manualSvg, setManualSvg] = useState('');
  const [generationResult, setGenerationResult] = useState<PlaygroundGenerateResult>();
  const [manualResult, setManualResult] = useState<PlaygroundManualRenderResult>();
  const [generationError, setGenerationError] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePage, setActivePage] = useState<PlaygroundPage>('scrambles');
  const [solverMode, setSolverModeState] = useState<PlaygroundSolverMode>('assist');
  const [solverEventId, setSolverEventIdState] = useState<PuzzleFullEventId>('333');
  const [solverScramble, setSolverScramble] = useState("R U R' U'");
  const [solverTargetText, setSolverTargetText] = useState(DEFAULT_SOLVER_TARGET_TEXT['333']);
  const [solverMethods, setSolverMethods] = useState<readonly PuzzleAssistMethod[]>(
    DEFAULT_SOLVER_METHODS['333'],
  );
  const [solverResult, setSolverResult] = useState<PlaygroundSolverResult>();
  const [fullSolverResult, setFullSolverResult] = useState<PlaygroundFullSolverResult>();
  const [selectedSolverSolution, setSelectedSolverSolution] = useState<PuzzleAssistSolution>();
  const [solverComparison, setSolverComparison] = useState<PlaygroundSolverComparison>();
  const [solverGenerationError, setSolverGenerationError] = useState<string>();
  const [playerDraftEventId, setPlayerDraftEventIdState] = useState<EventId>('333');
  const [playerEventId, setPlayerEventId] = useState<EventId>('333');
  const [playerDraftFormula, setPlayerDraftFormulaState] = useState("R U R' U'");
  const [playerFormula, setPlayerFormula] = useState("R U R' U'");
  const [playerGenerationError, setPlayerGenerationError] = useState<string>();
  const [playerSvg, setPlayerSvg] = useState('');
  const [playerImageError, setPlayerImageError] = useState<string>();

  const setScrambleTypeId = (nextScrambleTypeId: ScrambleTypeId) => {
    setScrambleTypeIdState(nextScrambleTypeId);
    setCaseSelectionMode('uniform');
    setEnabledCaseIdsText('');
    setGenerationError(undefined);
  };

  const generate = async () => {
    setGenerationError(undefined);
    setIsGenerating(true);
    const enabledCaseIds = parseCaseIdText(enabledCaseIdsText);

    try {
      const result = await packageService.generate({
        scrambleTypeId,
        count,
        multiBlindCubeCount,
        imageView,
        ...(scrambleTypeDefinition.caseSetId === undefined
          ? {}
          : {
              mode: caseSelectionMode,
              ...(enabledCaseIds === undefined ? {} : { enabledCaseIds }),
            }),
      });

      setGenerationResult(result);
      setScrambles(result.scrambles);
      setSelectedScramble(result.selectedScramble);
      setSelectedScrambleIndex(0);
      setSvg(result.svg);
      setManualScramble(result.selectedScramble?.scramble ?? '');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const selectScramble = (scramble: PlaygroundScramble) => {
    const result = packageService.renderManual({
      eventId: scramble.eventId,
      scramble: scramble.scramble,
      imageView,
    });

    setSelectedScramble(scramble);
    setSelectedScrambleIndex(
      Math.max(
        scrambles.findIndex((entry) => entry.id === scramble.id),
        0,
      ),
    );
    setSvg(result.svg);
    setManualScramble(scramble.scramble);
    setManualSvg(result.svg);
    setManualResult(result);
  };

  const renderManual = () => {
    const result = packageService.renderManual({ eventId, scramble: manualScramble, imageView });

    setManualResult(result);
    setManualSvg(result.svg);
  };

  const applyGeneratedSolverScramble = async (nextEventId: PuzzleFullEventId) => {
    const result = await packageService.generateSolverScramble(nextEventId);

    setSolverGenerationError(result.error);
    if (!result.error) {
      setSolverScramble(result.scramble);
      setSolverResult(undefined);
      setFullSolverResult(undefined);
      setSelectedSolverSolution(undefined);
      setSolverComparison(undefined);
    }
  };

  const setSolverEventId = async (nextEventId: PuzzleFullEventId) => {
    setSolverEventIdState(nextEventId);
    if (isPuzzleAssistEventId(nextEventId)) {
      setSolverMethods(DEFAULT_SOLVER_METHODS[nextEventId]);
      setSolverTargetText(DEFAULT_SOLVER_TARGET_TEXT[nextEventId]);
    }
    setSolverResult(undefined);
    setFullSolverResult(undefined);
    setSelectedSolverSolution(undefined);
    setSolverComparison(undefined);
    setSolverGenerationError(undefined);
    setSolverScramble('');

    await applyGeneratedSolverScramble(nextEventId);
  };

  const setSolverMode = async (nextMode: PlaygroundSolverMode) => {
    const nextEventId =
      nextMode === 'assist' && !isPuzzleAssistEventId(solverEventId) ? '333' : solverEventId;

    setSolverModeState(nextMode);
    setSolverEventIdState(nextEventId);
    if (isPuzzleAssistEventId(nextEventId)) {
      setSolverMethods(DEFAULT_SOLVER_METHODS[nextEventId]);
      setSolverTargetText(DEFAULT_SOLVER_TARGET_TEXT[nextEventId]);
    }
    setSolverResult(undefined);
    setFullSolverResult(undefined);
    setSelectedSolverSolution(undefined);
    setSolverComparison(undefined);
    setSolverGenerationError(undefined);
    setSolverScramble('');

    await applyGeneratedSolverScramble(nextEventId);
  };

  const generateSolverScramble = async () => {
    await applyGeneratedSolverScramble(solverEventId);
  };

  const applyGeneratedPlayerScramble = async (nextEventId: EventId) => {
    const result = await packageService.generatePlayerScramble(nextEventId, imageView);

    setPlayerGenerationError(result.error);
    setPlayerImageError(result.error);
    if (!result.error) {
      setPlayerDraftFormulaState(result.scramble);
      setPlayerEventId(nextEventId);
      setPlayerFormula(result.scramble);
      setPlayerSvg(result.svg);
    }
  };

  const setPlayerDraftEventId = async (nextEventId: EventId) => {
    setPlayerDraftEventIdState(nextEventId);
    setPlayerGenerationError(undefined);
    setPlayerImageError(undefined);
    setPlayerDraftFormulaState('');

    await applyGeneratedPlayerScramble(nextEventId);
  };

  const setPlayerDraftFormula = (nextFormula: string) => {
    setPlayerDraftFormulaState(nextFormula);
    setPlayerImageError(undefined);
  };

  const loadPlayerFormula = () => {
    const renderResult = packageService.renderManual({
      eventId: playerDraftEventId,
      scramble: playerDraftFormula,
      imageView,
    });

    setPlayerEventId(playerDraftEventId);
    setPlayerFormula(playerDraftFormula);
    setPlayerSvg(renderResult.svg);
    setPlayerImageError(renderResult.error);
  };

  const setSolverMethod = (method: PuzzleAssistMethod, checked: boolean) => {
    setSolverMethods((currentMethods) => {
      const nextMethods = checked
        ? [...currentMethods, method]
        : currentMethods.filter((currentMethod) => currentMethod !== method);
      const uniqueMethods = [...new Set(nextMethods)];

      return uniqueMethods.length > 0 ? uniqueMethods : currentMethods;
    });
  };

  const selectSolverSolution = (
    solution: PuzzleAssistSolution,
    nextImageView: PlaygroundImageView = imageView,
  ) => {
    setSelectedSolverSolution(solution);
    setSolverComparison(
      packageService.renderSolverComparison({
        eventId: solverEventId,
        scramble: solverScramble,
        setupRotation: solution.setupRotation,
        solution: solution.solution,
        imageView: nextImageView,
      }),
    );
  };

  const solvePuzzleAssist = () => {
    if (!isPuzzleAssistEventId(solverEventId)) return;

    const result = packageService.solvePuzzleAssist({
      eventId: solverEventId,
      scramble: solverScramble,
      methods: solverMethods,
      targets: parseTargetText(solverTargetText),
    });

    setSolverResult(result);
    setFullSolverResult(undefined);

    const firstSolution = result.results.find(({ solutions }) => solutions.length > 0)
      ?.solutions[0];
    if (firstSolution && !result.error) {
      selectSolverSolution(firstSolution);
    } else {
      setSelectedSolverSolution(undefined);
      setSolverComparison(undefined);
    }
  };

  const solvePuzzleFull = () => {
    const result = packageService.solvePuzzleFull({
      eventId: solverEventId,
      scramble: solverScramble,
    });

    setFullSolverResult(result);
    setSolverResult(undefined);
    setSelectedSolverSolution(undefined);
    setSolverComparison(
      result.result && !result.error
        ? packageService.renderSolverComparison({
            eventId: result.result.eventId,
            scramble: result.result.scramble,
            solution: result.result.solution,
            imageView,
          })
        : undefined,
    );
  };

  const setImageView = (nextImageView: PlaygroundImageView) => {
    setImageViewState(nextImageView);

    if (selectedScramble) {
      const result = packageService.renderManual({
        eventId: selectedScramble.eventId,
        scramble: selectedScramble.scramble,
        imageView: nextImageView,
      });

      setSvg(result.svg);
      setGenerationResult((previous) =>
        previous
          ? {
              ...previous,
              render: result.render,
            }
          : previous,
      );
    }

    if (manualScramble.length > 0 || manualResult) {
      const result = packageService.renderManual({
        eventId,
        scramble: manualScramble,
        imageView: nextImageView,
      });

      setManualResult(result);
      setManualSvg(result.svg);
    }

    if (playerFormula.length > 0 || playerSvg.length > 0) {
      const result = packageService.renderManual({
        eventId: playerEventId,
        scramble: playerFormula,
        imageView: nextImageView,
      });

      setPlayerSvg(result.svg);
      setPlayerImageError(result.error);
    }

    if (solverMode === 'assist' && selectedSolverSolution) {
      selectSolverSolution(selectedSolverSolution, nextImageView);
    } else if (solverMode === 'full' && fullSolverResult?.result) {
      setSolverComparison(
        packageService.renderSolverComparison({
          eventId: fullSolverResult.result.eventId,
          scramble: fullSolverResult.result.scramble,
          solution: fullSolverResult.result.solution,
          imageView: nextImageView,
        }),
      );
    }
  };

  return {
    activePage,
    setActivePage,
    scrambleTypeId,
    setScrambleTypeId,
    scrambleTypeDefinition,
    eventId,
    caseSelectionMode,
    setCaseSelectionMode,
    enabledCaseIdsText,
    setEnabledCaseIdsText,
    count,
    setCount,
    multiBlindCubeCount,
    setMultiBlindCubeCount,
    imageView,
    setImageView,
    scrambles,
    selectedScramble,
    selectedScrambleIndex,
    selectScramble,
    svg,
    manualScramble,
    setManualScramble,
    manualSvg,
    generationResult,
    manualResult,
    generationError,
    isGenerating,
    generate,
    renderManual,
    solverEventId,
    setSolverEventId,
    solverMode,
    setSolverMode,
    solverScramble,
    setSolverScramble,
    solverTargetText,
    setSolverTargetText,
    solverMethods,
    setSolverMethod,
    solverResult,
    fullSolverResult,
    selectedSolverSolution,
    selectSolverSolution,
    solverComparison,
    solverGenerationError,
    generateSolverScramble,
    solvePuzzleAssist,
    solvePuzzleFull,
    playerDraftEventId,
    setPlayerDraftEventId,
    playerEventId,
    playerDraftFormula,
    setPlayerDraftFormula,
    playerFormula,
    loadPlayerFormula,
    playerGenerationError,
    playerSvg,
    playerImageError,
  };
};

const parseTargetText = (value: string): readonly string[] | undefined => {
  const targets = value
    .split(',')
    .map((target) => target.trim())
    .filter((target) => target.length > 0);

  return targets.length > 0 ? targets : undefined;
};

const parseCaseIdText = (value: string): readonly string[] | undefined => {
  const caseIds = value
    .split(',')
    .map((caseId) => caseId.trim())
    .filter((caseId) => caseId.length > 0);

  return caseIds.length > 0 ? caseIds : undefined;
};

const isPuzzleAssistEventId = (eventId: PuzzleFullEventId): eventId is PuzzleAssistEventId =>
  ASSIST_SOLVER_EVENT_IDS.includes(eventId as PuzzleAssistEventId);
