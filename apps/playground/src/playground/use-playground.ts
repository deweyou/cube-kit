import { useMemo, useState } from 'react';
import type { WcaEventId } from '@cubekit/scramble-puzzle';
import { createPlaygroundService } from './playground-service';
import type {
  PlaygroundGenerateResult,
  PlaygroundManualRenderResult,
  PlaygroundScramble,
} from './types';

export type PlaygroundService = ReturnType<typeof createPlaygroundService>;

export interface UsePlaygroundOptions {
  readonly service?: PlaygroundService;
}

export const usePlayground = ({ service }: UsePlaygroundOptions = {}) => {
  const packageService = useMemo(() => service ?? createPlaygroundService(), [service]);
  const [eventId, setEventId] = useState<WcaEventId>('333');
  const [count, setCount] = useState(5);
  const [multiBlindCubeCount, setMultiBlindCubeCount] = useState(3);
  const [scrambles, setScrambles] = useState<readonly PlaygroundScramble[]>([]);
  const [selectedScramble, setSelectedScramble] = useState<PlaygroundScramble | undefined>();
  const [selectedScrambleIndex, setSelectedScrambleIndex] = useState(0);
  const [svg, setSvg] = useState('');
  const [manualScramble, setManualScramble] = useState('');
  const [manualSvg, setManualSvg] = useState('');
  const [generationResult, setGenerationResult] = useState<PlaygroundGenerateResult>();
  const [manualResult, setManualResult] = useState<PlaygroundManualRenderResult>();
  const [generationError, setGenerationError] = useState<string>();

  const generate = async () => {
    setGenerationError(undefined);

    try {
      const result = await packageService.generate({ eventId, count, multiBlindCubeCount });

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
    const result = packageService.renderManual({ eventId, scramble: manualScramble });

    setManualResult(result);
    setManualSvg(result.svg);
  };

  return {
    eventId,
    setEventId,
    count,
    setCount,
    multiBlindCubeCount,
    setMultiBlindCubeCount,
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
  };
};
