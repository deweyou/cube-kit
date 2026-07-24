import { type CSSProperties, useState } from 'react';
import { BRAND_ICON_SVGS, type BrandIconId } from '@cubegin/icons/brand';
import { EVENT_ICON_SVGS } from '@cubegin/icons/events';
import { CubeginAnimatedIcon, type CubeginAnimatedIconTrigger } from '@cubegin/icons/react';
import { getPlayerPuzzleSupport } from '@cubegin/player';
import { CubeginPlayer } from '@cubegin/player/react';
import { EVENT_IDS, EVENT_INFO, type EventId } from '@cubegin/shared/events';
import type { PuzzleAssistEventId, PuzzleAssistMethod, PuzzleFullEventId } from '@cubegin/solver';
import { writeScramblesToClipboard } from './playground/copy';
import { createSvgDownloadName } from './playground/download';
import type { PlaygroundImageView } from './playground/types';
import { type PlaygroundService, usePlayground } from './playground/use-playground';

type PlaygroundState = ReturnType<typeof usePlayground>;

const ICON_PREVIEW_SIZES = [24, 64, 100, 128, 160] as const;
type IconPreviewSize = (typeof ICON_PREVIEW_SIZES)[number];

const PLAYER_EVENT_IDS = EVENT_IDS.filter(
  (eventId) => getPlayerPuzzleSupport(eventId).type !== 'unsupported',
);

const ICON_PREVIEW_BACKGROUNDS = [
  { label: 'White background', value: '#ffffff' },
  { label: 'Gray background', value: '#e8edf1' },
  { label: 'Dark background', value: '#1f2a30' },
  { label: 'Blue background', value: '#6b99bd' },
] as const;
type IconPreviewBackground = (typeof ICON_PREVIEW_BACKGROUNDS)[number]['value'];

interface IconPreviewAsset {
  readonly id: string;
  readonly label: string;
  readonly meta: string;
  readonly previewSurface?: 'dark';
  readonly svg: string;
  readonly variant?: 'wide';
}

const BRAND_ICON_LABELS = {
  'appicon-dark': 'App icon dark',
  'appicon-gradient': 'App icon gradient',
  'appicon-white': 'App icon white',
  'cubegin-lockup-dark': 'Cubegin lockup dark',
  'cubegin-lockup': 'Cubegin lockup',
  'cubegin-mark': 'Cubegin mark',
  'cubegin-wordmark-dark': 'Cubegin wordmark dark',
  'cubegin-wordmark': 'Cubegin wordmark',
} satisfies Record<BrandIconId, string>;

const BRAND_ICON_IDS = Object.keys(BRAND_ICON_SVGS) as BrandIconId[];

const ANIMATED_ICON_PREVIEWS = [
  {
    id: 'cubegin-entrance-hover',
    label: 'Cubegin entrance hover',
    meta: 'react: trigger=hover',
    trigger: 'hover',
  },
  {
    id: 'cubegin-entrance-loop',
    label: 'Cubegin entrance loop',
    meta: 'react: trigger=loop',
    trigger: 'loop',
  },
] satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly meta: string;
  readonly trigger: CubeginAnimatedIconTrigger;
}[];

const SOLVER_EVENTS: readonly {
  readonly eventId: PuzzleAssistEventId;
  readonly label: string;
}[] = [
  { eventId: '333', label: '3x3' },
  { eventId: '222', label: '2x2' },
  { eventId: 'sq1', label: 'Square-1' },
  { eventId: 'pyram', label: 'Pyraminx' },
  { eventId: 'skewb', label: 'Skewb' },
];

const FULL_SOLVER_EVENTS: readonly {
  readonly eventId: PuzzleFullEventId;
  readonly label: string;
}[] = [
  { eventId: '333', label: '3x3' },
  { eventId: '444', label: '4x4' },
  { eventId: '222', label: '2x2' },
  { eventId: 'pyram', label: 'Pyraminx' },
  { eventId: 'skewb', label: 'Skewb' },
  { eventId: 'sq1', label: 'Square-1' },
  { eventId: 'clock', label: 'Clock' },
  { eventId: 'fto', label: 'FTO' },
];

const SOLVER_METHODS: Record<
  PuzzleAssistEventId,
  readonly {
    readonly method: PuzzleAssistMethod;
    readonly label: string;
  }[]
> = {
  '333': [
    { method: 'cross', label: 'Cross' },
    { method: 'xcross', label: 'XCross' },
    { method: 'eoline', label: 'EOline' },
    { method: 'eofc', label: 'EOFC' },
    { method: 'roux-s1', label: 'Roux S1' },
    { method: 'petrus-s1', label: 'Petrus S1' },
    { method: 'cfop-f2l', label: 'CFOP F2L' },
    { method: 'roux-s2', label: 'Roux S2' },
    { method: 'petrus-s2', label: 'Petrus S2' },
    { method: 'zz-f2l', label: 'ZZ F2L' },
    { method: 'block-222', label: '2x2x2 block' },
    { method: 'eo-dr', label: 'EO + DR' },
    { method: '333-two-phase', label: '3x3 TwoPhase' },
    { method: '333-general', label: '3x3 General' },
  ],
  '222': [
    { method: '222-face', label: 'Face' },
    { method: '222-layer', label: 'Layer' },
  ],
  sq1: [
    { method: 'sq1-shape-ftm', label: 'SQ1 shape FTM' },
    { method: 'sq1-shape-twist', label: 'SQ1 shape twist' },
  ],
  pyram: [{ method: 'pyraminx-v', label: 'Pyraminx V' }],
  skewb: [{ method: 'skewb-face', label: 'Skewb Face' }],
};

const SOLVER_EVENT_TITLES = {
  '333': '3x3 auxiliary restore',
  '222': '2x2 auxiliary restore',
  sq1: 'Square-1 shape restore',
  pyram: 'Pyraminx V restore',
  skewb: 'Skewb face restore',
} satisfies Record<PuzzleAssistEventId, string>;

const FULL_SOLVER_EVENT_TITLES = {
  '333': '3x3 full restore',
  '444': '4x4 full restore',
  '222': '2x2 full restore',
  pyram: 'Pyraminx full restore',
  skewb: 'Skewb full restore',
  sq1: 'Square-1 full restore',
  clock: 'Clock full restore',
  fto: 'FTO full restore',
} satisfies Record<PuzzleFullEventId, string>;

const SOLVER_TARGET_OPTIONS = {
  '333': [
    { value: '', label: 'All targets' },
    { value: 'D', label: 'D face' },
    { value: 'U', label: 'U face' },
    { value: 'L', label: 'L face' },
    { value: 'R', label: 'R face' },
    { value: 'F', label: 'F face' },
    { value: 'B', label: 'B face' },
    { value: 'DF DB', label: 'EOline DF DB' },
    { value: 'D(FB)', label: 'EOFC D(FB)' },
    { value: 'LU', label: 'Roux LU' },
    { value: 'ULF', label: 'Petrus ULF' },
    { value: 'URF', label: '2x2x2 URF' },
    { value: 'UFL', label: '2x2x2 UFL' },
    { value: 'ULB', label: '2x2x2 ULB' },
    { value: 'UBR', label: '2x2x2 UBR' },
    { value: 'DFR', label: '2x2x2 DFR' },
    { value: 'DLF', label: '2x2x2 DLF' },
    { value: 'DBL', label: '2x2x2 DBL' },
    { value: 'DRB', label: '2x2x2 DRB' },
  ],
  '222': [
    { value: '', label: 'All targets' },
    { value: 'D', label: 'D face/layer' },
    { value: 'U', label: 'U face/layer' },
    { value: 'L', label: 'L face/layer' },
    { value: 'R', label: 'R face/layer' },
    { value: 'F', label: 'F face/layer' },
    { value: 'B', label: 'B face/layer' },
  ],
  sq1: [{ value: 'shape', label: 'Shape' }],
  pyram: [
    { value: '', label: 'All targets' },
    { value: 'D', label: 'D V' },
    { value: 'L', label: 'L V' },
    { value: 'R', label: 'R V' },
    { value: 'F', label: 'F V' },
  ],
  skewb: [
    { value: '', label: 'All targets' },
    { value: 'D', label: 'D face' },
    { value: 'U', label: 'U face' },
    { value: 'L', label: 'L face' },
    { value: 'R', label: 'R face' },
    { value: 'F', label: 'F face' },
    { value: 'B', label: 'B face' },
  ],
} satisfies Record<
  PuzzleAssistEventId,
  readonly { readonly value: string; readonly label: string }[]
>;

const EMPTY_SOLVER_TEXT = {
  '333': 'Run a 3x3 helper method to inspect solver output.',
  '222': 'Run a 2x2 helper method to inspect solver output.',
  sq1: 'Run a Square-1 shape helper to inspect solver output.',
  pyram: 'Run a Pyraminx V helper to inspect solver output.',
  skewb: 'Run a Skewb face helper to inspect solver output.',
} satisfies Record<PuzzleAssistEventId, string>;

const EMPTY_FULL_SOLVER_TEXT = {
  '333': 'Run the 3x3 full solver to inspect restore output.',
  '444': 'Run the 4x4 full solver to inspect restore output.',
  '222': 'Run the 2x2 full solver to inspect restore output.',
  pyram: 'Run the Pyraminx full solver to inspect restore output.',
  skewb: 'Run the Skewb full solver to inspect restore output.',
  sq1: 'Run the Square-1 full solver to inspect restore output.',
  clock: 'Run the Clock full solver to inspect restore output.',
  fto: 'Run the FTO full solver to inspect restore output.',
} satisfies Record<PuzzleFullEventId, string>;

export interface AppProps {
  readonly service?: PlaygroundService;
}

const SVG_PREVIEW_STYLE = {
  '--scramble-svg-preview-width': '320px',
  '--scramble-svg-preview-height': '240px',
} as CSSProperties;

const COMPACT_SVG_PREVIEW_STYLE = {
  '--scramble-svg-preview-width': '240px',
  '--scramble-svg-preview-height': '180px',
} as CSSProperties;

export const App = ({ service }: AppProps = {}) => {
  const playground = usePlayground({ service });
  const [actionMessage, setActionMessage] = useState<string>();

  const copyScrambles = async () => {
    try {
      await writeScramblesToClipboard(playground.scrambles);
      setActionMessage('Scrambles copied.');
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const downloadSelectedSvg = () => {
    if (!playground.selectedScramble || playground.svg.length === 0) return;

    const objectUrl = URL.createObjectURL(
      new Blob([playground.svg], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = createSvgDownloadName({
      eventId: playground.selectedScramble.eventId,
      index: playground.selectedScrambleIndex,
    });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    setActionMessage('SVG download prepared.');
  };

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cubegin</p>
          <h1>Scramble Playground</h1>
        </div>
        <p className="baseline">TNoodle baseline: WCA 1.2.3</p>
      </header>

      <nav className="page-tabs" role="tablist" aria-label="Playground views">
        <button
          aria-controls="scramble-panel"
          aria-selected={playground.activePage === 'scrambles'}
          className="tab-button"
          id="scramble-tab"
          role="tab"
          type="button"
          onClick={() => playground.setActivePage('scrambles')}
        >
          Scrambles
        </button>
        <button
          aria-controls="solver-panel"
          aria-selected={playground.activePage === 'solvers'}
          className="tab-button"
          id="solver-tab"
          role="tab"
          type="button"
          onClick={() => playground.setActivePage('solvers')}
        >
          Solvers
        </button>
        <button
          aria-controls="player-panel"
          aria-selected={playground.activePage === 'player'}
          className="tab-button"
          id="player-tab"
          role="tab"
          type="button"
          onClick={() => playground.setActivePage('player')}
        >
          Player
        </button>
        <button
          aria-controls="icons-panel"
          aria-selected={playground.activePage === 'icons'}
          className="tab-button"
          id="icons-tab"
          role="tab"
          type="button"
          onClick={() => playground.setActivePage('icons')}
        >
          Icons
        </button>
      </nav>

      {playground.activePage === 'scrambles' ? (
        <ScramblePage
          actionMessage={actionMessage}
          playground={playground}
          copyScrambles={copyScrambles}
          downloadSelectedSvg={downloadSelectedSvg}
        />
      ) : null}

      {playground.activePage === 'solvers' ? <SolverPage playground={playground} /> : null}
      {playground.activePage === 'player' ? (
        <PlayerPage
          draftEventId={playground.playerDraftEventId}
          draftFormula={playground.playerDraftFormula}
          eventId={playground.playerEventId}
          formula={playground.playerFormula}
          generationError={playground.playerGenerationError}
          imageError={playground.playerImageError}
          imageSvg={playground.playerSvg}
          setDraftEventId={playground.setPlayerDraftEventId}
          setDraftFormula={playground.setPlayerDraftFormula}
          loadFormula={playground.loadPlayerFormula}
        />
      ) : null}
      {playground.activePage === 'icons' ? <IconsPage /> : null}
    </main>
  );
};

const PlayerPage = ({
  draftEventId,
  draftFormula,
  eventId,
  formula,
  setDraftEventId,
  setDraftFormula,
  loadFormula,
  generationError,
  imageSvg,
  imageError,
}: {
  readonly draftEventId: EventId;
  readonly draftFormula: string;
  readonly eventId: EventId;
  readonly formula: string;
  readonly setDraftEventId: (eventId: EventId) => void | Promise<void>;
  readonly setDraftFormula: (formula: string) => void;
  readonly loadFormula: () => void;
  readonly generationError: string | undefined;
  readonly imageSvg: string;
  readonly imageError: string | undefined;
}) => (
  <section
    aria-labelledby="player-tab"
    className="player-workbench"
    id="player-panel"
    role="tabpanel"
  >
    <aside className="panel player-controls-panel" aria-label="Player controls">
      <div className="panel-heading">
        <p className="eyebrow">player</p>
        <h2>Formula player</h2>
      </div>

      <label className="field">
        <span>Player event</span>
        <select
          value={draftEventId}
          onChange={(event) => void setDraftEventId(event.currentTarget.value as EventId)}
        >
          {PLAYER_EVENT_IDS.map((optionEventId) => (
            <option key={optionEventId} value={optionEventId}>
              {optionEventId} - {EVENT_INFO[optionEventId].label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Player formula</span>
        <textarea
          value={draftFormula}
          onChange={(event) => setDraftFormula(event.currentTarget.value)}
        />
      </label>

      <button className="primary-action" type="button" onClick={loadFormula}>
        Load formula
      </button>

      {generationError ? (
        <p className="error" role="alert">
          {generationError}
        </p>
      ) : null}

      <Diagnostics
        title="Player"
        values={[
          ['Event', eventId],
          ['Moves', String(formula.trim().split(/\s+/).filter(Boolean).length)],
        ]}
      />
    </aside>

    <section className="panel player-stage-panel">
      <div className="panel-heading">
        <p className="eyebrow">three.js</p>
        <h2>3D player</h2>
      </div>

      <CubeginPlayer className="playground-player" eventId={eventId} formula={formula} />
    </section>

    <section className="panel player-image-panel" aria-label="Player scramble image">
      <div className="panel-heading">
        <p className="eyebrow">scramble-image</p>
        <h2>End reference</h2>
      </div>

      {imageSvg ? (
        <div
          className="player-image-preview"
          dangerouslySetInnerHTML={{ __html: imageSvg }}
          data-testid="player-scramble-image"
        />
      ) : (
        <p className="empty-state">Load a formula to render its scramble image.</p>
      )}

      {imageError ? (
        <p className="error" role="alert">
          {imageError}
        </p>
      ) : null}
    </section>
  </section>
);

const IconsPage = () => {
  const [previewSize, setPreviewSize] = useState<IconPreviewSize>(100);
  const [previewBackground, setPreviewBackground] = useState<IconPreviewBackground>('#ffffff');
  const brandIcons = BRAND_ICON_IDS.map((iconId) => ({
    id: iconId,
    label: BRAND_ICON_LABELS[iconId],
    meta: `brand/svg/${iconId}.svg`,
    previewSurface: iconId.endsWith('-dark') ? 'dark' : undefined,
    svg: BRAND_ICON_SVGS[iconId],
    variant: iconId.includes('lockup') || iconId.includes('wordmark') ? 'wide' : undefined,
  })) satisfies IconPreviewAsset[];
  const eventIcons = EVENT_IDS.map((eventId) => ({
    id: eventId,
    label: `${eventId} - ${EVENT_INFO[eventId].label}`,
    meta: EVENT_INFO[eventId].puzzleId,
    svg: EVENT_ICON_SVGS[eventId],
  })) satisfies IconPreviewAsset[];

  return (
    <section
      aria-labelledby="icons-tab"
      className="icons-workbench"
      id="icons-panel"
      role="tabpanel"
      style={
        {
          '--icon-asset-frame-size': `${previewSize + 24}px`,
          '--icon-asset-preview-bg': previewBackground,
          '--icon-asset-size': `${previewSize}px`,
        } as CSSProperties
      }
    >
      <section className="panel icons-panel">
        <div className="icons-panel-header">
          <div className="panel-heading">
            <p className="eyebrow">icons</p>
            <h2>Cubegin icon assets</h2>
          </div>

          <div className="icon-preview-controls">
            <div className="icon-bg-control" role="group" aria-label="Icon background">
              {ICON_PREVIEW_BACKGROUNDS.map(({ label, value }) => (
                <button
                  aria-label={label}
                  aria-pressed={previewBackground === value}
                  className={
                    previewBackground === value ? 'icon-bg-option selected' : 'icon-bg-option'
                  }
                  key={value}
                  style={{ '--icon-bg-swatch': value } as CSSProperties}
                  title={label}
                  type="button"
                  onClick={() => setPreviewBackground(value)}
                />
              ))}
            </div>

            <div className="icon-size-control" role="group" aria-label="Icon size">
              {ICON_PREVIEW_SIZES.map((size) => (
                <button
                  aria-pressed={previewSize === size}
                  className={
                    previewSize === size ? 'segmented-option selected' : 'segmented-option'
                  }
                  key={size}
                  type="button"
                  onClick={() => setPreviewSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <IconAssetSection assets={brandIcons} heading="Brand assets" testIdPrefix="brand-icon" />
        <AnimatedIconSection />
        <IconAssetSection assets={eventIcons} heading="event icons" testIdPrefix="event-icon" />
      </section>
    </section>
  );
};

const AnimatedIconSection = () => (
  <section className="icon-asset-section" aria-labelledby="animated-icon-heading">
    <h3 id="animated-icon-heading">Animated React icons</h3>
    <div className="icon-asset-grid" aria-label="Animated React icons">
      {ANIMATED_ICON_PREVIEWS.map((asset) => (
        <article
          className="icon-asset-card"
          data-testid={`animated-icon-${asset.id}`}
          key={asset.id}
        >
          <div className="icon-asset-preview" data-testid={`animated-icon-svg-${asset.id}`}>
            <CubeginAnimatedIcon trigger={asset.trigger} />
          </div>
          <div className="icon-asset-copy">
            <strong>{asset.label}</strong>
            <span>{asset.meta}</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const IconAssetSection = ({
  assets,
  heading,
  testIdPrefix,
}: {
  readonly assets: readonly IconPreviewAsset[];
  readonly heading: string;
  readonly testIdPrefix: string;
}) => (
  <section className="icon-asset-section" aria-labelledby={`${testIdPrefix}-heading`}>
    <h3 id={`${testIdPrefix}-heading`}>{heading}</h3>
    <div className="icon-asset-grid" aria-label={heading}>
      {assets.map((asset) => (
        <article
          className={asset.variant === 'wide' ? 'icon-asset-card wide' : 'icon-asset-card'}
          data-testid={`${testIdPrefix}-${asset.id}`}
          id={`${testIdPrefix}-${asset.id}`}
          key={asset.id}
        >
          <div
            className="icon-asset-preview"
            data-testid={`${testIdPrefix}-svg-${asset.id}`}
            style={
              asset.previewSurface === 'dark'
                ? ({ '--icon-asset-local-bg': '#1f2a30' } as CSSProperties)
                : undefined
            }
            dangerouslySetInnerHTML={{ __html: asset.svg }}
          />
          <div className="icon-asset-copy">
            <strong>{asset.label}</strong>
            <span>{asset.meta}</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const ScramblePage = ({
  actionMessage,
  playground,
  copyScrambles,
  downloadSelectedSvg,
}: {
  readonly actionMessage: string | undefined;
  readonly playground: PlaygroundState;
  readonly copyScrambles: () => Promise<void>;
  readonly downloadSelectedSvg: () => void;
}) => (
  <>
    <section
      aria-labelledby="scramble-tab"
      className="workbench"
      id="scramble-panel"
      role="tabpanel"
    >
      <aside className="panel controls-panel" aria-label="Controls">
        <div className="panel-heading">
          <p className="eyebrow">Controls</p>
          <h2>Generate</h2>
        </div>

        <label className="field">
          <span>Event</span>
          <select
            value={playground.eventId}
            onChange={(event) => playground.setEventId(event.currentTarget.value as EventId)}
          >
            {EVENT_IDS.map((eventId) => (
              <option key={eventId} value={eventId}>
                {eventId} - {EVENT_INFO[eventId].label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Count</span>
          <input
            min={1}
            max={20}
            type="number"
            value={playground.count}
            onChange={(event) =>
              playground.setCount(clampInteger(Number(event.currentTarget.value), 1, 20))
            }
          />
        </label>

        {playground.eventId === '333mbld' ? (
          <label className="field">
            <span>MultiBLD cubes</span>
            <input
              min={2}
              max={99}
              type="number"
              value={playground.multiBlindCubeCount}
              onChange={(event) =>
                playground.setMultiBlindCubeCount(
                  clampInteger(Number(event.currentTarget.value), 2, 99),
                )
              }
            />
          </label>
        ) : null}

        <button className="primary-action" type="button" onClick={() => void playground.generate()}>
          Generate
        </button>

        <div className="action-stack">
          <button
            className="secondary-action"
            disabled={playground.scrambles.length === 0}
            type="button"
            onClick={() => void copyScrambles()}
          >
            Copy scrambles
          </button>
          <button
            className="secondary-action"
            disabled={!playground.selectedScramble || playground.svg.length === 0}
            type="button"
            onClick={downloadSelectedSvg}
          >
            Download selected SVG
          </button>
        </div>

        {actionMessage ? <p className="action-message">{actionMessage}</p> : null}
      </aside>

      <section className="panel core-panel">
        <div className="panel-heading">
          <p className="eyebrow">scramble-core</p>
          <h2>Generated scrambles</h2>
        </div>

        <ol className="scramble-list">
          {playground.scrambles.map((scramble, index) => (
            <li key={scramble.id}>
              <button
                className={
                  scramble.id === playground.selectedScramble?.id
                    ? 'scramble-row selected'
                    : 'scramble-row'
                }
                type="button"
                onClick={() => playground.selectScramble(scramble)}
              >
                <span className="scramble-index">{index + 1}</span>
                <span>{scramble.scramble}</span>
              </button>
            </li>
          ))}
        </ol>

        {playground.scrambles.length === 0 ? (
          <p className="empty-state">Generate a scramble batch to inspect core output.</p>
        ) : null}

        {playground.generationError ? (
          <p className="error" role="alert">
            {playground.generationError}
          </p>
        ) : null}

        <Diagnostics
          title="Generation"
          values={[
            ['Count', String(playground.generationResult?.generation.count ?? 0)],
            ['Duration', `${formatMs(playground.generationResult?.generation.durationMs)} ms`],
          ]}
        />
      </section>

      <section className="panel image-panel">
        <div className="panel-heading">
          <p className="eyebrow">scramble-image</p>
          <h2>SVG preview</h2>
        </div>

        <div className="preview-toolbar">
          <div className="segmented-control" role="group" aria-label="Image view">
            {IMAGE_VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                aria-pressed={playground.imageView === option.value}
                className={
                  playground.imageView === option.value
                    ? 'segmented-option selected'
                    : 'segmented-option'
                }
                type="button"
                onClick={() => playground.setImageView(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="svg-preview"
          data-testid="svg-preview"
          style={SVG_PREVIEW_STYLE}
          dangerouslySetInnerHTML={{ __html: playground.svg }}
        />

        {playground.svg.length === 0 ? (
          <p className="empty-state">The selected scramble image appears here.</p>
        ) : null}

        <Diagnostics
          title="Render"
          values={[
            ['Scramble chars', String(playground.generationResult?.render.scrambleLength ?? 0)],
            ['SVG bytes', String(playground.generationResult?.render.svgBytes ?? 0)],
            ['Duration', `${formatMs(playground.generationResult?.render.durationMs)} ms`],
          ]}
        />
      </section>
    </section>

    <section className="manual-panel panel">
      <div className="panel-heading">
        <p className="eyebrow">Manual render</p>
        <h2>Test scramble-image directly</h2>
      </div>

      <div className="manual-grid">
        <label className="field">
          <span>Manual scramble</span>
          <textarea
            value={playground.manualScramble}
            onChange={(event) => playground.setManualScramble(event.currentTarget.value)}
          />
        </label>

        <div>
          <button className="secondary-action" type="button" onClick={playground.renderManual}>
            Render manual scramble
          </button>

          {playground.manualResult?.error ? (
            <p className="error" role="alert">
              {playground.manualResult.error}
            </p>
          ) : null}

          <Diagnostics
            title="Manual render"
            values={[
              ['Scramble chars', String(playground.manualResult?.render.scrambleLength ?? 0)],
              ['SVG bytes', String(playground.manualResult?.render.svgBytes ?? 0)],
              ['Duration', `${formatMs(playground.manualResult?.render.durationMs)} ms`],
            ]}
          />
        </div>

        <div
          className="svg-preview compact"
          data-testid="manual-svg-preview"
          style={COMPACT_SVG_PREVIEW_STYLE}
          dangerouslySetInnerHTML={{ __html: playground.manualSvg }}
        />
      </div>
    </section>
  </>
);

const SolverPage = ({ playground }: { readonly playground: PlaygroundState }) => {
  const assistEventId = isPuzzleAssistEventId(playground.solverEventId)
    ? playground.solverEventId
    : '333';
  const solverEvents = playground.solverMode === 'assist' ? SOLVER_EVENTS : FULL_SOLVER_EVENTS;
  const solverTitle =
    playground.solverMode === 'assist'
      ? SOLVER_EVENT_TITLES[assistEventId]
      : FULL_SOLVER_EVENT_TITLES[playground.solverEventId];
  const solverDiagnostics =
    playground.solverMode === 'assist'
      ? playground.solverResult?.diagnostics
      : playground.fullSolverResult?.diagnostics;
  const solverError =
    playground.solverMode === 'assist'
      ? playground.solverResult?.error
      : playground.fullSolverResult?.error;

  return (
    <section
      aria-labelledby="solver-tab"
      className="solver-workbench"
      id="solver-panel"
      role="tabpanel"
    >
      <section className="panel solver-controls-panel">
        <div className="panel-heading">
          <p className="eyebrow">solver</p>
          <h2>{solverTitle}</h2>
        </div>

        <div className="solver-mode-toolbar">
          <div className="segmented-control" role="group" aria-label="Solver mode">
            {(['assist', 'full'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={playground.solverMode === mode}
                className={
                  playground.solverMode === mode ? 'segmented-option selected' : 'segmented-option'
                }
                type="button"
                onClick={() => void playground.setSolverMode(mode)}
              >
                {mode === 'assist' ? 'Assist' : 'Full'}
              </button>
            ))}
          </div>
        </div>

        <div className="solver-grid">
          <div className="solver-scramble-stack">
            <label className="field">
              <span>Solver event</span>
              <select
                value={playground.solverEventId}
                onChange={(event) =>
                  void playground.setSolverEventId(event.currentTarget.value as PuzzleFullEventId)
                }
              >
                {solverEvents.map(({ eventId, label }) => (
                  <option key={eventId} value={eventId}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field solver-scramble-field">
              <span>Solver scramble</span>
              <textarea
                value={playground.solverScramble}
                onChange={(event) => playground.setSolverScramble(event.currentTarget.value)}
              />
            </label>

            <button
              className="secondary-action"
              type="button"
              onClick={() => void playground.generateSolverScramble()}
            >
              Generate solver scramble
            </button>
          </div>

          <div className="solver-options">
            {playground.solverMode === 'assist' ? (
              <>
                <label className="field">
                  <span>Solver targets</span>
                  <select
                    value={playground.solverTargetText}
                    onChange={(event) => playground.setSolverTargetText(event.currentTarget.value)}
                  >
                    {SOLVER_TARGET_OPTIONS[assistEventId].map(({ value, label }) => (
                      <option key={value || 'all-targets'} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="method-fieldset">
                  <legend>Methods</legend>
                  <div className="method-grid">
                    {SOLVER_METHODS[assistEventId].map(({ method, label }) => (
                      <label className="method-option" key={method}>
                        <input
                          checked={playground.solverMethods.includes(method)}
                          type="checkbox"
                          onChange={(event) =>
                            playground.setSolverMethod(method, event.currentTarget.checked)
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : (
              <div className="full-solver-summary">
                <dl className="diagnostics compact" aria-label="Full solver selection">
                  <div>
                    <dt>Event</dt>
                    <dd>{playground.solverEventId}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Full</dd>
                  </div>
                </dl>
              </div>
            )}

            <button
              className="primary-action"
              type="button"
              onClick={
                playground.solverMode === 'assist'
                  ? playground.solvePuzzleAssist
                  : playground.solvePuzzleFull
              }
            >
              Solve
            </button>
          </div>
        </div>

        {solverError ? (
          <p className="error" role="alert">
            {solverError}
          </p>
        ) : null}

        {playground.solverGenerationError ? (
          <p className="error" role="alert">
            {playground.solverGenerationError}
          </p>
        ) : null}

        <Diagnostics
          title="Solver"
          values={[
            ['Result count', String(solverDiagnostics?.resultCount ?? 0)],
            ['Duration', `${formatMs(solverDiagnostics?.durationMs)} ms`],
          ]}
        />
      </section>

      <section className="panel solver-results-panel">
        <div className="panel-heading">
          <p className="eyebrow">solutions</p>
          <h2>{playground.solverMode === 'assist' ? 'Assist results' : 'Full result'}</h2>
        </div>

        {playground.solverMode === 'assist' ? (
          playground.solverResult && playground.solverResult.results.length > 0 ? (
            <div className="solver-results">
              <table className="solver-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Solutions</th>
                  </tr>
                </thead>
                <tbody>
                  {playground.solverResult.results.map((result) => (
                    <tr key={result.method}>
                      <td>{result.method}</td>
                      <td>
                        <ol className="solution-list">
                          {result.solutions.map((solution) => (
                            <li
                              key={`${solution.target}-${solution.setupRotation}-${solution.solution}`}
                            >
                              <button
                                aria-label={`Preview ${result.method} ${solution.targetLabel} solution`}
                                aria-pressed={playground.selectedSolverSolution === solution}
                                className="solution-select"
                                type="button"
                                onClick={() => playground.selectSolverSolution(solution)}
                              >
                                <span>{solution.targetLabel}</span>
                                <code>{solution.setupRotation || '-'}</code>
                                <strong>{solution.solution || '-'}</strong>
                                <span>{solution.metric.ftm} FTM</span>
                              </button>
                            </li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">{EMPTY_SOLVER_TEXT[assistEventId]}</p>
          )
        ) : playground.fullSolverResult?.result ? (
          <div className="solver-results">
            <table className="solver-table">
              <thead>
                <tr>
                  <th>Engine</th>
                  <th>Solution</th>
                  <th>Move count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{playground.fullSolverResult.result.engine}</td>
                  <td>
                    <strong>{playground.fullSolverResult.result.solution || '-'}</strong>
                  </td>
                  <td>{playground.fullSolverResult.result.moveCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">{EMPTY_FULL_SOLVER_TEXT[playground.solverEventId]}</p>
        )}
      </section>

      {playground.solverComparison ? (
        <SolverComparison comparison={playground.solverComparison} />
      ) : null}
    </section>
  );
};

const SolverComparison = ({
  comparison,
}: {
  readonly comparison: NonNullable<PlaygroundState['solverComparison']>;
}) => (
  <section className="panel solver-comparison-panel" aria-label="Solver state comparison">
    <div className="panel-heading">
      <p className="eyebrow">scramble-image</p>
      <h2>State comparison</h2>
    </div>

    <div className="solver-comparison-grid">
      <article className="solver-comparison-pane">
        <h3>Scrambled state</h3>
        <div
          className="svg-preview solver-state-preview"
          dangerouslySetInnerHTML={{ __html: comparison.scrambleSvg }}
          data-testid="solver-scramble-preview"
          style={SVG_PREVIEW_STYLE}
        />
      </article>

      <span className="solver-comparison-arrow" aria-hidden="true">
        →
      </span>

      <article className="solver-comparison-pane">
        <h3>After selected solution</h3>
        <div
          className="svg-preview solver-state-preview"
          dangerouslySetInnerHTML={{ __html: comparison.solutionSvg }}
          data-testid="solver-solution-preview"
          style={SVG_PREVIEW_STYLE}
        />
      </article>
    </div>

    {comparison.error ? (
      <p className="error" role="alert">
        {comparison.error}
      </p>
    ) : null}
  </section>
);

const Diagnostics = ({
  title,
  values,
}: {
  readonly title: string;
  readonly values: readonly (readonly [string, string])[];
}) => (
  <div className="diagnostics-group">
    <h3>{title}</h3>
    <dl className="diagnostics" aria-label={title}>
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const formatMs = (value: number | undefined) => (value === undefined ? '0.0' : value.toFixed(1));

const IMAGE_VIEW_OPTIONS: readonly {
  readonly label: string;
  readonly value: PlaygroundImageView;
}[] = [
  { label: '2D', value: 'net' },
  { label: '3D', value: 'isometric' },
];

const clampInteger = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;

  return Math.min(Math.max(Math.trunc(value), min), max);
};

const isPuzzleAssistEventId = (eventId: PuzzleFullEventId): eventId is PuzzleAssistEventId =>
  SOLVER_EVENTS.some((event) => event.eventId === eventId);
