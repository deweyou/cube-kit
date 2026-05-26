import { WCA_EVENT_IDS, WCA_EVENT_INFO, type WcaEventId } from '@cubekit/scramble-puzzle';
import { usePlayground } from './playground/use-playground';

export const App = () => {
  const playground = usePlayground();

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">CubeKit</p>
          <h1>Scramble Playground</h1>
        </div>
        <p className="baseline">TNoodle baseline: WCA 1.2.3</p>
      </header>

      <section className="workbench">
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

          <button className="primary-action" type="button" onClick={() => void playground.generate()}>
            Generate
          </button>
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
    </main>
  );
};

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
