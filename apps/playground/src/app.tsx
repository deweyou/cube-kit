import { useState } from 'react';
import { WCA_EVENT_IDS, WCA_EVENT_INFO, type WcaEventId } from '@cubekit/scramble-puzzle';
import type { ThreeByThreeAssistMethod } from '@cubekit/solver';
import { writeScramblesToClipboard } from './playground/copy';
import { createSvgDownloadName } from './playground/download';
import { usePlayground } from './playground/use-playground';

type PlaygroundState = ReturnType<typeof usePlayground>;

const SOLVER_METHODS: readonly {
  readonly method: ThreeByThreeAssistMethod;
  readonly label: string;
}[] = [
  { method: 'cross', label: 'Cross' },
  { method: 'xcross', label: 'XCross' },
  { method: 'eoline', label: 'EOline' },
  { method: 'eofc', label: 'EOFC' },
  { method: 'roux-s1', label: 'Roux S1' },
  { method: 'petrus-s1', label: 'Petrus S1' },
];

export const App = () => {
  const playground = usePlayground();
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
          <p className="eyebrow">CubeKit</p>
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
    </main>
  );
};

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
            onChange={(event) => playground.setEventId(event.currentTarget.value as WcaEventId)}
          >
            {WCA_EVENT_IDS.map((eventId) => (
              <option key={eventId} value={eventId}>
                {eventId} - {WCA_EVENT_INFO[eventId].label}
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

        <button
          className="primary-action"
          type="button"
          onClick={() => void playground.generate()}
        >
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

        <div
          className="svg-preview"
          data-testid="svg-preview"
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
          dangerouslySetInnerHTML={{ __html: playground.manualSvg }}
        />
      </div>
    </section>
  </>
);

const SolverPage = ({ playground }: { readonly playground: PlaygroundState }) => (
  <section
    aria-labelledby="solver-tab"
    className="solver-workbench"
    id="solver-panel"
    role="tabpanel"
  >
    <section className="panel solver-controls-panel">
      <div className="panel-heading">
        <p className="eyebrow">solver</p>
        <h2>3x3 auxiliary restore</h2>
      </div>

      <div className="solver-grid">
        <label className="field solver-scramble-field">
          <span>Solver scramble</span>
          <textarea
            value={playground.solverScramble}
            onChange={(event) => playground.setSolverScramble(event.currentTarget.value)}
          />
        </label>

        <div className="solver-options">
          <label className="field">
            <span>Solver targets</span>
            <input
              placeholder="D, U(FB), F2L#1"
              value={playground.solverTargetText}
              onChange={(event) => playground.setSolverTargetText(event.currentTarget.value)}
            />
          </label>

          <fieldset className="method-fieldset">
            <legend>Methods</legend>
            <div className="method-grid">
              {SOLVER_METHODS.map(({ method, label }) => (
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

          <button className="primary-action" type="button" onClick={playground.solveThreeByThree}>
            Solve
          </button>
        </div>
      </div>

      {playground.solverResult?.error ? (
        <p className="error" role="alert">
          {playground.solverResult.error}
        </p>
      ) : null}

      <Diagnostics
        title="Solver"
        values={[
          ['Result count', String(playground.solverResult?.diagnostics.resultCount ?? 0)],
          ['Duration', `${formatMs(playground.solverResult?.diagnostics.durationMs)} ms`],
        ]}
      />
    </section>

    <section className="panel solver-results-panel">
      <div className="panel-heading">
        <p className="eyebrow">solutions</p>
        <h2>Assist results</h2>
      </div>

      {playground.solverResult && playground.solverResult.results.length > 0 ? (
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
                        <li key={`${solution.target}-${solution.setupRotation}-${solution.solution}`}>
                          <span>{solution.targetLabel}</span>
                          <code>{solution.setupRotation || '-'}</code>
                          <strong>{solution.solution || '-'}</strong>
                          <span>{solution.metric.ftm} FTM</span>
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
        <p className="empty-state">Run a 3x3 helper method to inspect solver output.</p>
      )}
    </section>
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

const clampInteger = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;

  return Math.min(Math.max(Math.trunc(value), min), max);
};
