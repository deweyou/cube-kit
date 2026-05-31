import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app';

afterEach(cleanup);

describe('App', () => {
  it('generates scrambles and renders an SVG preview', async () => {
    render(<App />);

    await userEvent.clear(screen.getByLabelText('Count'));
    await userEvent.type(screen.getByLabelText('Count'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(await screen.findByText(/scramble-core/i)).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeTruthy();
    expect(screen.getByText(/Generation/i)).toBeTruthy();
  });

  it('shows MultiBLD cube count only for 333mbld', async () => {
    render(<App />);

    expect(screen.queryByLabelText('MultiBLD cubes')).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText('Event'), '333mbld');

    expect(screen.getByLabelText('MultiBLD cubes')).toBeTruthy();
  });

  it('renders manual scramble text through scramble-image', async () => {
    render(<App />);

    await userEvent.clear(screen.getByLabelText('Manual scramble'));
    await userEvent.type(screen.getByLabelText('Manual scramble'), "R U R' U'");
    await userEvent.click(screen.getByRole('button', { name: 'Render manual scramble' }));

    expect(screen.getByTestId('manual-svg-preview').querySelector('svg')).toBeTruthy();
  });

  it('enables copy and SVG download actions after generation', async () => {
    render(<App />);

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

  it('shows Square-1 and Pyraminx helper methods in the solver page', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('tab', { name: 'Solvers' }));
    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'sq1');
    expect(screen.getByLabelText('SQ1 shape FTM')).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText('Solver event'), 'pyram');
    expect(screen.getByLabelText('Pyraminx V')).toBeTruthy();
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
