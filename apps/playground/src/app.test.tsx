import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { EVENT_IDS } from '@cubegin/shared/events';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import type {
  PlaygroundFullSolverInput,
  PlaygroundGenerateInput,
  PlaygroundManualRenderInput,
} from './playground/types';
import type { PlaygroundService } from './playground/use-playground';

vi.mock('@cubegin/player/react', () => ({
  CubeginPlayer: ({ eventId, formula }: { readonly eventId: string; readonly formula: string }) => (
    <div data-event-id={eventId} data-formula={formula} data-testid="mock-cubegin-player" />
  ),
}));

afterEach(cleanup);

describe('App', () => {
  it('generates scrambles and renders an SVG preview', async () => {
    renderTestApp();

    await userEvent.clear(screen.getByLabelText('Count'));
    await userEvent.type(screen.getByLabelText('Count'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText(/scramble-core/i)).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeTruthy();
    expect(screen.getByText(/Generation/i)).toBeTruthy();
  });

  it('toggles the selected SVG preview between 2D and 3D views', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));

    const preview = screen.getByTestId('svg-preview');
    expect(screen.getByRole('button', { name: '2D' }).getAttribute('aria-pressed')).toBe('true');
    expect(preview.querySelectorAll('rect').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: '3D' }));

    expect(screen.getByRole('button', { name: '3D' }).getAttribute('aria-pressed')).toBe('true');
    expect(preview.querySelectorAll('path')).toHaveLength(54);
    expect(preview.querySelectorAll('rect')).toHaveLength(0);
  });

  it('uses fixed fit boxes for scramble SVG previews', () => {
    renderTestApp();

    const generatedPreviewStyle = screen.getByTestId('svg-preview').getAttribute('style') ?? '';
    const manualPreviewStyle = screen.getByTestId('manual-svg-preview').getAttribute('style') ?? '';

    expect(generatedPreviewStyle).toContain('--scramble-svg-preview-width: 320px');
    expect(generatedPreviewStyle).toContain('--scramble-svg-preview-height: 240px');
    expect(manualPreviewStyle).toContain('--scramble-svg-preview-width: 240px');
    expect(manualPreviewStyle).toContain('--scramble-svg-preview-height: 180px');
  });

  it('shows MultiBLD cube count only for 333mbld', async () => {
    renderTestApp();

    expect(screen.queryByLabelText('MultiBLD cubes')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Event'), '333mbld');

    expect(screen.getByLabelText('MultiBLD cubes')).toBeTruthy();
  });

  it('shows Cubegin brand, animated React, and event icons in the playground gallery', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Icons' }));

    expect(screen.getByRole('tabpanel', { name: 'Icons' })).toBeTruthy();
    expect(screen.getAllByTestId(/^brand-icon-svg-/)).toHaveLength(8);
    expect(screen.getAllByTestId(/^animated-icon-svg-/)).toHaveLength(2);
    expect(screen.getAllByTestId(/^event-icon-svg-/)).toHaveLength(EVENT_IDS.length);
    expect(screen.getByTestId('brand-icon-svg-cubegin-mark').querySelector('svg')).toBeTruthy();
    const entranceHoverIcon = screen
      .getByTestId('animated-icon-svg-cubegin-entrance-hover')
      .querySelector('svg');
    const entranceLoopIcon = screen
      .getByTestId('animated-icon-svg-cubegin-entrance-loop')
      .querySelector('svg');

    expect(entranceHoverIcon?.getAttribute('data-trigger')).toBe('hover');
    expect(entranceLoopIcon?.getAttribute('data-trigger')).toBe('loop');
    expect(screen.getByText('333 - 3x3x3 Cube')).toBeTruthy();
    expect(screen.getByTestId('event-icon-svg-333').querySelector('svg')).toBeTruthy();
    expect(screen.getByTestId('event-icon-333mbld').textContent).toContain('333mbld');
    expect(screen.getByTestId('event-icon-fto').textContent).toContain('fto');
  });

  it('loads formulas in the player page', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Player' }));
    await userEvent.selectOptions(screen.getByLabelText('Player event'), '444');
    await waitFor(() => {
      expect((screen.getByLabelText('Player formula') as HTMLTextAreaElement).value).toBe(
        '444-player-scramble',
      );
    });
    await userEvent.click(screen.getByRole('button', { name: 'Load formula' }));

    const player = screen.getByTestId('mock-cubegin-player');
    expect(player.getAttribute('data-event-id')).toBe('444');
    expect(player.getAttribute('data-formula')).toBe('444-player-scramble');
    expect(screen.getByTestId('player-scramble-image').querySelector('svg')).toBeTruthy();
  });

  it('loads non-cube formulas in the player page', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Player' }));

    const playerEventSelect = screen.getByLabelText('Player event');

    expect(within(playerEventSelect).getByRole('option', { name: /pyram -/i })).toBeTruthy();
    expect(within(playerEventSelect).getByRole('option', { name: /skewb -/i })).toBeTruthy();
    expect(within(playerEventSelect).getByRole('option', { name: /fto -/i })).toBeTruthy();
    expect(within(playerEventSelect).getByRole('option', { name: /minx -/i })).toBeTruthy();
    expect(within(playerEventSelect).getByRole('option', { name: /clock -/i })).toBeTruthy();
    expect(within(playerEventSelect).getByRole('option', { name: /sq1 -/i })).toBeTruthy();

    await userEvent.selectOptions(playerEventSelect, 'sq1');
    await waitFor(() => {
      expect((screen.getByLabelText('Player formula') as HTMLTextAreaElement).value).toBe(
        'sq1-player-scramble',
      );
    });
    await userEvent.click(screen.getByRole('button', { name: 'Load formula' }));

    const player = screen.getByTestId('mock-cubegin-player');
    expect(player.getAttribute('data-event-id')).toBe('sq1');
    expect(player.getAttribute('data-formula')).toBe('sq1-player-scramble');
    expect(screen.getByTestId('player-scramble-image').querySelector('svg')).toBeTruthy();
  });

  it('changes icon preview size from the icons gallery', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Icons' }));
    await userEvent.click(screen.getByRole('button', { name: '128' }));

    expect(screen.getByRole('button', { name: '128' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Icons' }).getAttribute('style')).toContain(
      '--icon-asset-size: 128px',
    );
  });

  it('changes icon preview background from the icons gallery', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Icons' }));
    await userEvent.click(screen.getByRole('button', { name: 'Dark background' }));

    expect(
      screen.getByRole('button', { name: 'Dark background' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Icons' }).getAttribute('style')).toContain(
      '--icon-asset-preview-bg: #1f2a30',
    );
  });

  it('renders manual scramble text through scramble-image', async () => {
    renderTestApp();

    await userEvent.clear(screen.getByLabelText('Manual scramble'));
    await userEvent.type(screen.getByLabelText('Manual scramble'), "R U R' U'");
    await userEvent.click(screen.getByRole('button', { name: 'Render manual scramble' }));

    expect(screen.getByTestId('manual-svg-preview').querySelector('svg')).toBeTruthy();
  });

  it('enables copy and SVG download actions after generation', async () => {
    renderTestApp();

    expect(screen.getByRole('button', { name: 'Copy scrambles' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Download selected SVG' })).toHaveProperty(
      'disabled',
      true,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(screen.getByRole('button', { name: 'Copy scrambles' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByRole('button', { name: 'Download selected SVG' })).toHaveProperty(
      'disabled',
      false,
    );
  });

  it('opens the solver page and shows auxiliary solutions', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.clear(screen.getByLabelText('Solver scramble'));
    await userEvent.type(screen.getByLabelText('Solver scramble'), 'R U');
    await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(await screen.findByText('cross')).toBeTruthy();
    expect(screen.getByText(/Result count/i)).toBeTruthy();
  });

  it('shows cstimer-style 3x3 staged helper methods in the solver page', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));

    expect(screen.getByLabelText('CFOP F2L')).toBeTruthy();
    expect(screen.getByLabelText('Roux S2')).toBeTruthy();
    expect(screen.getByLabelText('Petrus S2')).toBeTruthy();
    expect(screen.getByLabelText('ZZ F2L')).toBeTruthy();
    expect(screen.getByLabelText('2x2x2 block')).toBeTruthy();
    expect(screen.getByLabelText('EO + DR')).toBeTruthy();
    expect(screen.getByLabelText('3x3 TwoPhase')).toBeTruthy();
    expect(screen.getByLabelText('3x3 General')).toBeTruthy();
    expect(screen.getByRole('option', { name: '2x2x2 URF' })).toBeTruthy();
  });

  it('generates a 3x3 scramble for the solver page', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.clear(screen.getByLabelText('Solver scramble'));
    await userEvent.click(screen.getByRole('button', { name: 'Generate solver scramble' }));

    expect(
      (screen.getByLabelText('Solver scramble') as HTMLTextAreaElement).value.length,
    ).toBeGreaterThan(0);
  });

  it('renders solver targets as an event-aware select', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));

    expect(screen.getByLabelText('Solver targets').tagName).toBe('SELECT');

    await userEvent.selectOptions(screen.getByLabelText('Solver event'), '222');

    expect(screen.getByRole('option', { name: 'D face/layer' })).toBeTruthy();
  });

  it('switches solver events, auto-generates a scramble, and solves 2x2', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.clear(screen.getByLabelText('Solver scramble'));
    await userEvent.selectOptions(screen.getByLabelText('Solver event'), '222');

    expect(
      ((await screen.findByLabelText('Solver scramble')) as HTMLTextAreaElement).value.length,
    ).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(await screen.findByText('222-face')).toBeTruthy();
    expect(screen.getByText('Face')).toBeTruthy();
  });

  it('shows Square-1, Pyraminx, and Skewb helper methods in the solver page', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'sq1');
    expect(screen.getByLabelText('SQ1 shape FTM')).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'pyram');
    expect(screen.getByLabelText('Pyraminx V')).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'skewb');
    expect(screen.getByLabelText('Skewb Face')).toBeTruthy();
  });

  it('switches to Skewb Face and solves a face target', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'skewb');
    await userEvent.clear(screen.getByLabelText('Solver scramble'));
    await userEvent.type(screen.getByLabelText('Solver scramble'), 'R U');
    await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(await screen.findByText('skewb-face')).toBeTruthy();
    expect(screen.getByText('Skewb Face')).toBeTruthy();
  });

  it('switches to full solver mode and shows a full solution', async () => {
    renderTestApp();

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.click(screen.getByRole('button', { name: 'Full' }));
    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'clock');
    await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect(await screen.findByText('clock-inverse')).toBeTruthy();
    expect(screen.getByText('UR1- y2 DR1+')).toBeTruthy();
    expect(screen.getByText(/Move count/i)).toBeTruthy();
  });

  it('shows solver errors without leaving the solver page', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.clear(screen.getByLabelText('Solver scramble'));
    await userEvent.type(screen.getByLabelText('Solver scramble'), 'Rw');
    await userEvent.click(screen.getByRole('button', { name: 'Solve' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Rw');
  });
});

const renderTestApp = () => render(<App service={fakeService()} />);

const fakeService = (): PlaygroundService => ({
  async generate(input: PlaygroundGenerateInput) {
    const selectedScramble = { id: '333-1', eventId: input.eventId, scramble: "R U R' U'" };

    return {
      scrambles: [selectedScramble, { id: '333-2', eventId: input.eventId, scramble: 'F2 U2' }],
      selectedScramble,
      svg: svgForView(input.imageView),
      generation: { durationMs: 1, count: 2 },
      render: { durationMs: 2, scrambleLength: selectedScramble.scramble.length, svgBytes: 20 },
    };
  },
  renderManual(input: PlaygroundManualRenderInput) {
    return {
      svg: svgForView(input.imageView),
      render: { durationMs: 3, scrambleLength: input.scramble.length, svgBytes: 30 },
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
  async generatePlayerScramble(eventId, imageView = 'net') {
    return {
      eventId,
      scramble: `${eventId}-player-scramble`,
      svg: `<svg data-view="${imageView}"></svg>`,
      render: { durationMs: 4, scrambleLength: `${eventId}-player-scramble`.length, svgBytes: 32 },
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
        solution: 'UR1- y2 DR1+',
        moveCount: 2,
        engine: 'clock-inverse' as const,
      },
      diagnostics: { durationMs: 2, resultCount: 1 },
      error: undefined,
    };
  },
});

const svgForView = (imageView: PlaygroundManualRenderInput['imageView']) =>
  imageView === 'isometric' ? `<svg>${'<path></path>'.repeat(54)}</svg>` : '<svg><rect /></svg>';
