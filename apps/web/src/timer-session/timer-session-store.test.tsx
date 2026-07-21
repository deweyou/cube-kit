import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  formatFewestMovesSolve,
  formatMultiBlindSolve,
  getEventShortLabel,
  getSolveDisplayText,
  type SolvePenalty,
} from '@cubegin/shared/timer-session';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryTimerSessionDb } from './timer-session-db';
import {
  TimerSessionStoreProvider,
  useTimerSessionStore,
  type AddSolveInput,
  type TimerSessionDb,
} from './timer-session-store';

const StoreProbe = () => {
  const {
    activeList,
    activeListSolveRecords,
    addSolve,
    createList,
    deleteSolve,
    isLoading,
    lists,
    setActiveListId,
    updateList,
    updateSolveFewestMoves,
    updateSolveMultiBlind,
    updateSolvePenalty,
  } = useTimerSessionStore();
  const newestSolve = activeListSolveRecords[0];

  const addActiveSolve = (input: Partial<AddSolveInput> = {}) => {
    void addSolve({
      elapsedMs: input.elapsedMs ?? 1234,
      eventId: input.eventId ?? activeList.scrambleTypeId,
      listId: input.listId ?? activeList.id,
      penalty: input.penalty ?? 'none',
      scramble: input.scramble ?? "R U R' U'",
      fewestMoves: input.fewestMoves,
      multiBlind: input.multiBlind,
    });
  };

  const updateNewestPenalty = (penalty: SolvePenalty) => {
    if (!newestSolve) return;
    void updateSolvePenalty(newestSolve.id, penalty);
  };

  const deleteNewestSolve = () => {
    if (!newestSolve) return;
    void deleteSolve(newestSolve.id);
  };

  return (
    <section aria-label="timer-session-store-probe">
      <output aria-label="loading">{isLoading ? 'loading' : 'ready'}</output>
      <output aria-label="active-list">{activeList.name}</output>
      <output aria-label="active-list-event">{activeList.scrambleTypeId}</output>
      <output aria-label="list-count">{lists.length}</output>
      <output aria-label="solve-count">{activeListSolveRecords.length}</output>
      <output aria-label="newest-solve">
        {newestSolve
          ? newestSolve.fewestMoves
            ? formatFewestMovesSolve(newestSolve)
            : newestSolve.multiBlind
              ? formatMultiBlindSolve(newestSolve)
              : getSolveDisplayText(newestSolve.elapsedMs, newestSolve.penalty)
          : 'none'}
      </output>
      <button
        type="button"
        onClick={() => {
          void createList({ name: '四阶练习', scrambleTypeId: '444' });
        }}
      >
        create-list
      </button>
      <button
        type="button"
        onClick={() =>
          addActiveSolve({
            elapsedMs: 2_800_000,
            eventId: '333fm',
            fewestMoves: {
              attemptDurationMs: 2_800_000,
              executionMoveCount: 24,
              inverseScrambleReview: 'not-suspected',
              moveCount: 24,
              normalizedSolution: "U' R'",
              rawSolution: "U' R'",
              rulesVersion: 'wca-2026-04-01',
              validationReason: null,
              validationStatus: 'valid',
            },
            scramble: 'R U',
          })
        }
      >
        add-fmc-solve
      </button>
      <button
        type="button"
        onClick={() => {
          if (!newestSolve) return;
          void updateSolveFewestMoves(
            newestSolve.id,
            {
              attemptDurationMs: 2_800_000,
              executionMoveCount: 22,
              inverseScrambleReview: 'dismissed',
              moveCount: 22,
              normalizedSolution: "U' R' F F'",
              rawSolution: "U' R' F F'",
              rulesVersion: 'wca-2026-04-01',
              validationReason: null,
              validationStatus: 'valid',
            },
            'none',
          );
        }}
      >
        edit-fmc-solve
      </button>
      <button
        type="button"
        onClick={() => {
          void updateList({ listId: activeList.id, name: '四阶耐力', scrambleTypeId: '444' });
        }}
      >
        update-list
      </button>
      <button
        type="button"
        onClick={() => {
          void setActiveListId('main-333');
        }}
      >
        select-333
      </button>
      <button type="button" onClick={() => addActiveSolve()}>
        add-solve
      </button>
      <button
        type="button"
        onClick={() =>
          addActiveSolve({
            elapsedMs: 2_430_999,
            eventId: '333mbld',
            multiBlind: { attemptedCount: 5, solvedCount: 3, timePenaltyCount: 0 },
            scramble: ['1', '2', '3', '4', '5'],
          })
        }
      >
        add-mbld-solve
      </button>
      <button
        type="button"
        onClick={() => {
          if (!newestSolve) return;
          void updateSolveMultiBlind(
            newestSolve.id,
            { attemptedCount: 5, solvedCount: 4, timePenaltyCount: 2 },
            'none',
          );
        }}
      >
        edit-mbld-solve
      </button>
      <button type="button" onClick={() => addActiveSolve({ elapsedMs: 2000, eventId: '444' })}>
        add-444-solve
      </button>
      <button type="button" onClick={() => updateNewestPenalty('+2')}>
        mark-plus-two
      </button>
      <button type="button" onClick={deleteNewestSolve}>
        delete-newest
      </button>
    </section>
  );
};

const renderStoreProbe = (db: TimerSessionDb = createMemoryTimerSessionDb()) =>
  render(
    <TimerSessionStoreProvider db={db}>
      <StoreProbe />
    </TimerSessionStoreProvider>,
  );

afterEach(() => {
  cleanup();
});

describe('TimerSessionStoreProvider', () => {
  it('starts with one default list per event and the 3x3 list active', async () => {
    renderStoreProbe();

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));

    expect(screen.getByLabelText('active-list').textContent).toBe(getEventShortLabel('333'));
    expect(screen.getByLabelText('active-list-event').textContent).toBe('333');
    expect(screen.getByLabelText('list-count').textContent).toBe('18');
    expect(screen.getByLabelText('solve-count').textContent).toBe('0');
  });

  it('creates, edits, selects, and appends solves to the active list', async () => {
    renderStoreProbe();

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'create-list' }));

    await waitFor(() => expect(screen.getByLabelText('active-list').textContent).toBe('四阶练习'));
    expect(screen.getByLabelText('active-list-event').textContent).toBe('444');
    expect(screen.getByLabelText('list-count').textContent).toBe('19');

    fireEvent.click(screen.getByRole('button', { name: 'add-444-solve' }));

    await waitFor(() => expect(screen.getByLabelText('solve-count').textContent).toBe('1'));
    expect(screen.getByLabelText('newest-solve').textContent).toBe('2.000');

    fireEvent.click(screen.getByRole('button', { name: 'update-list' }));

    await waitFor(() => expect(screen.getByLabelText('active-list').textContent).toBe('四阶耐力'));

    fireEvent.click(screen.getByRole('button', { name: 'select-333' }));

    await waitFor(() =>
      expect(screen.getByLabelText('active-list').textContent).toBe(getEventShortLabel('333')),
    );
    expect(screen.getByLabelText('solve-count').textContent).toBe('0');
  });

  it('persists active list, solves, penalty edits, and deletes through the db adapter', async () => {
    const db = createMemoryTimerSessionDb();
    const firstRender = renderStoreProbe(db);

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'add-solve' }));

    await waitFor(() => expect(screen.getByLabelText('newest-solve').textContent).toBe('1.234'));

    fireEvent.click(screen.getByRole('button', { name: 'mark-plus-two' }));

    await waitFor(() => expect(screen.getByLabelText('newest-solve').textContent).toBe('3.234+'));
    firstRender.unmount();

    renderStoreProbe(db);

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));
    expect(screen.getByLabelText('solve-count').textContent).toBe('1');
    expect(screen.getByLabelText('newest-solve').textContent).toBe('3.234+');

    fireEvent.click(screen.getByRole('button', { name: 'delete-newest' }));

    await waitFor(() => expect(screen.getByLabelText('solve-count').textContent).toBe('0'));
    expect(screen.getByLabelText('newest-solve').textContent).toBe('none');
  });

  it('persists and edits structured multi-blind results', async () => {
    const db = createMemoryTimerSessionDb();
    renderStoreProbe(db);

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'add-mbld-solve' }));
    await waitFor(() =>
      expect(screen.getByLabelText('newest-solve').textContent).toBe('3/5 40:30'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'edit-mbld-solve' }));
    await waitFor(() =>
      expect(screen.getByLabelText('newest-solve').textContent).toBe('4/5 40:34'),
    );

    const [storedSolve] = await db.listSolves('main-333');
    expect(storedSolve?.multiBlind).toEqual({
      attemptedCount: 5,
      solvedCount: 4,
      timePenaltyCount: 2,
    });
  });

  it('persists and edits structured fewest-moves results', async () => {
    const db = createMemoryTimerSessionDb();
    renderStoreProbe(db);

    await waitFor(() => expect(screen.getByLabelText('loading').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'add-fmc-solve' }));
    await waitFor(() => expect(screen.getByLabelText('newest-solve').textContent).toBe('24'));

    fireEvent.click(screen.getByRole('button', { name: 'edit-fmc-solve' }));
    await waitFor(() => expect(screen.getByLabelText('newest-solve').textContent).toBe('22'));

    const [storedSolve] = await db.listSolves('main-333');
    expect(storedSolve?.fewestMoves).toMatchObject({
      inverseScrambleReview: 'dismissed',
      moveCount: 22,
      rawSolution: "U' R' F F'",
    });
  });
});
