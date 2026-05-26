import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './app';

afterEach(cleanup);

describe('App', () => {
  it('generates scrambles and renders an SVG preview', async () => {
    render(<App />);

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
});
