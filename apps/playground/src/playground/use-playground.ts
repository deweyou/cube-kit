import { useMemo, useState } from 'react';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import type { PuzzleAssistEventId, PuzzleAssistMethod, PuzzleFullEventId } from '@cubegin/solver';
import { getBrowserSeed } from './browser-seed';
import { createPlaygroundService } from './playground-service';
import type {
  PlaygroundFullSolverResult,
  PlaygroundGenerateResult,
  PlaygroundImageView,
  PlaygroundManualRenderResult,
  PlaygroundScramble,
  PlaygroundSolverResult,
} from './types';

export type PlaygroundPage = 'scrambles' | 'solvers' | 'icons';
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
  const [eventId, setEventId] = useState<WcaEventId>('333');
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
  const [solverGenerationError, setSolverGenerationError] = useState<string>();

  const generate = async () => {
    setGenerationError(undefined);

    try {
      const result = await packageService.generate({
        eventId,
        count,
        multiBlindCubeCount,
        imageView,
      });

      setGenerationResult(result);
      setScrambles(result.scrambles);
      setSelectedScramble(result.selectedScramble);
      setSelectedScrambleIndex(0);
      setSvg(result.svg);
      setManualScramble(result.selectedScramble?.scramble ?? '');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : String(error));
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
    setSolverGenerationError(undefined);
    setSolverScramble('');

    await applyGeneratedSolverScramble(nextEventId);
  };

  const generateSolverScramble = async () => {
    await applyGeneratedSolverScramble(solverEventId);
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

  const solvePuzzleAssist = () => {
    if (!isPuzzleAssistEventId(solverEventId)) return;

    const result = packageService.solvePuzzleAssist({
      eventId: solverEventId,
      scramble: solverScramble,
      methods: solverMethods,
      targets: parseTargetText(solverTargetText),
    });

    setSolverResult(result);
  };

  const solvePuzzleFull = () => {
    const result = packageService.solvePuzzleFull({
      eventId: solverEventId,
      scramble: solverScramble,
    });

    setFullSolverResult(result);
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
  };

  return {
    activePage,
    setActivePage,
    eventId,
    setEventId,
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
    solverGenerationError,
    generateSolverScramble,
    solvePuzzleAssist,
    solvePuzzleFull,
  };
};

const parseTargetText = (value: string): readonly string[] | undefined => {
  const targets = value
    .split(',')
    .map((target) => target.trim())
    .filter((target) => target.length > 0);

  return targets.length > 0 ? targets : undefined;
};

const isPuzzleAssistEventId = (eventId: PuzzleFullEventId): eventId is PuzzleAssistEventId =>
  ASSIST_SOLVER_EVENT_IDS.includes(eventId as PuzzleAssistEventId);
