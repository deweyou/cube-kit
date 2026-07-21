import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EVENT_IDS, type EventId } from '@cubegin/shared/events';
import {
  type FewestMovesSolveResult,
  getEventShortLabel,
  type MultiBlindSolveResult,
  type SolvePenalty,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import { createIndexedDbTimerSessionDb } from './timer-session-db';

export interface TimerList {
  createdAt: number;
  id: string;
  isDefault: boolean;
  name: string;
  scrambleTypeId: EventId;
}

export interface ListInput {
  name: string;
  scrambleTypeId: EventId;
}

export interface UpdateListInput extends ListInput {
  listId: string;
}

export interface AddSolveInput {
  elapsedMs: number;
  eventId: EventId;
  fewestMoves?: FewestMovesSolveResult;
  listId: string;
  multiBlind?: MultiBlindSolveResult;
  penalty: SolvePenalty;
  scramble: string | string[];
}

export interface TimerSessionDb {
  addSolve(record: SolveRecord): Promise<SolveRecord>;
  deleteSolve(solveId: string): Promise<void>;
  getActiveListId(): Promise<string | undefined>;
  initialize(defaultLists: readonly TimerList[]): Promise<void>;
  listSessions(): Promise<TimerList[]>;
  listSolves(listId: string): Promise<SolveRecord[]>;
  setActiveListId(listId: string): Promise<void>;
  updateList(list: TimerList): Promise<TimerList>;
  updateSolveMultiBlind(
    solveId: string,
    multiBlind: MultiBlindSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ): Promise<SolveRecord>;
  updateSolveFewestMoves(
    solveId: string,
    fewestMoves: FewestMovesSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ): Promise<SolveRecord>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
}

interface TimerSessionStoreContextValue {
  activeList: TimerList;
  activeListId: string;
  activeListSolveRecords: SolveRecord[];
  addSolve(input: AddSolveInput): Promise<SolveRecord>;
  createList(input: ListInput): Promise<TimerList>;
  deleteSolve(solveId: string): Promise<void>;
  error?: string;
  isLoading: boolean;
  lists: TimerList[];
  retry(): Promise<void>;
  setActiveListId(listId: string): Promise<void>;
  updateList(input: UpdateListInput): Promise<TimerList>;
  updateSolveMultiBlind(
    solveId: string,
    multiBlind: MultiBlindSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ): Promise<SolveRecord>;
  updateSolveFewestMoves(
    solveId: string,
    fewestMoves: FewestMovesSolveResult,
    penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
  ): Promise<SolveRecord>;
  updateSolvePenalty(solveId: string, penalty: SolvePenalty): Promise<SolveRecord>;
}

export const INITIAL_TIMER_LISTS: TimerList[] = EVENT_IDS.map((eventId, index) => ({
  createdAt: index,
  id: `main-${eventId}`,
  isDefault: true,
  name: getEventShortLabel(eventId),
  scrambleTypeId: eventId,
}));

const EMPTY_SOLVES: SolveRecord[] = [];
const FIRST_TIMER_LIST = INITIAL_TIMER_LISTS[0]!;

const TimerSessionStoreContext = createContext<TimerSessionStoreContextValue | undefined>(
  undefined,
);

const getErrorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const sortLists = (lists: readonly TimerList[]): TimerList[] =>
  [...lists].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

const getSolveOrdinalFromId = (solveId: string): number => {
  const ordinalText = solveId.slice(solveId.lastIndexOf(':') + 1);
  const ordinal = Number(ordinalText);
  return Number.isFinite(ordinal) ? ordinal : 0;
};

const sortSolvesNewestFirst = (solves: readonly SolveRecord[]): SolveRecord[] =>
  [...solves].sort(
    (a, b) =>
      b.createdAt - a.createdAt || getSolveOrdinalFromId(b.id) - getSolveOrdinalFromId(a.id),
  );

const makeTimerSolveRecord = ({
  input,
  solveIndex,
}: {
  input: AddSolveInput;
  solveIndex: number;
}): SolveRecord => ({
  createdAt: Date.now(),
  elapsedMs: input.elapsedMs,
  eventId: input.eventId,
  id: `${input.listId}:${solveIndex}`,
  penalty: input.penalty,
  fewestMoves: input.fewestMoves === undefined ? undefined : { ...input.fewestMoves },
  multiBlind: input.multiBlind === undefined ? undefined : { ...input.multiBlind },
  scramble: input.scramble,
  sessionId: input.listId,
});

interface TimerSessionStoreProviderProps {
  children: ReactNode;
  db?: TimerSessionDb;
}

export const TimerSessionStoreProvider = ({ children, db }: TimerSessionStoreProviderProps) => {
  const [storeDb] = useState<TimerSessionDb>(() => db ?? createIndexedDbTimerSessionDb());
  const [lists, setLists] = useState<TimerList[]>(INITIAL_TIMER_LISTS);
  const [activeListId, setActiveListIdState] = useState(FIRST_TIMER_LIST.id);
  const [activeListSolveRecords, setActiveListSolveRecords] = useState<SolveRecord[]>(EMPTY_SOLVES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const solveOrdinalByListId = useRef(new Map<string, number>());

  const getNextSolveIndex = useCallback((listId: string, solves: readonly SolveRecord[]) => {
    const highestStoredOrdinal = Math.max(
      0,
      ...solves.map((solve) => getSolveOrdinalFromId(solve.id)),
    );
    const currentOrdinal = solveOrdinalByListId.current.get(listId) ?? highestStoredOrdinal;
    const nextOrdinal = Math.max(currentOrdinal, highestStoredOrdinal) + 1;

    solveOrdinalByListId.current.set(listId, nextOrdinal);
    return nextOrdinal;
  }, []);

  const loadState = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      await storeDb.initialize(INITIAL_TIMER_LISTS);

      const storedLists = sortLists(await storeDb.listSessions());
      const nextLists = storedLists.length > 0 ? storedLists : INITIAL_TIMER_LISTS;
      const storedActiveListId = await storeDb.getActiveListId();
      const nextActiveListId =
        storedActiveListId !== undefined && nextLists.some((list) => list.id === storedActiveListId)
          ? storedActiveListId
          : nextLists[0]!.id;

      if (storedActiveListId !== nextActiveListId) {
        await storeDb.setActiveListId(nextActiveListId);
      }

      const activeSolves = sortSolvesNewestFirst(await storeDb.listSolves(nextActiveListId));
      solveOrdinalByListId.current.set(
        nextActiveListId,
        Math.max(0, ...activeSolves.map((solve) => getSolveOrdinalFromId(solve.id))),
      );

      setLists(nextLists);
      setActiveListIdState(nextActiveListId);
      setActiveListSolveRecords(activeSolves);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [storeDb]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? lists[0] ?? FIRST_TIMER_LIST,
    [activeListId, lists],
  );

  const setActiveListId = useCallback(
    async (listId: string) => {
      const nextList = lists.find((list) => list.id === listId);
      if (nextList === undefined) return;

      setActiveListIdState(nextList.id);
      setActiveListSolveRecords(EMPTY_SOLVES);

      try {
        await storeDb.setActiveListId(nextList.id);
        setActiveListSolveRecords(sortSolvesNewestFirst(await storeDb.listSolves(nextList.id)));
      } catch (cause) {
        setError(getErrorMessage(cause));
      }
    },
    [lists, storeDb],
  );

  const createList = useCallback(
    async ({ name, scrambleTypeId }: ListInput) => {
      const list: TimerList = {
        createdAt: Date.now(),
        id: `custom:${lists.length + 1}`,
        isDefault: false,
        name,
        scrambleTypeId,
      };

      const nextLists = sortLists([...lists, list]);

      setLists(nextLists);
      setActiveListIdState(list.id);
      setActiveListSolveRecords(EMPTY_SOLVES);
      solveOrdinalByListId.current.set(list.id, 0);

      const savedList = await storeDb.updateList(list);
      await storeDb.setActiveListId(savedList.id);

      return savedList;
    },
    [lists, storeDb],
  );

  const updateList = useCallback(
    async ({ listId, name, scrambleTypeId }: UpdateListInput) => {
      const currentList = lists.find((list) => list.id === listId);
      if (currentList === undefined) {
        throw new Error(`Timer list not found: ${listId}`);
      }

      const nextList = {
        ...currentList,
        name,
        scrambleTypeId,
      };

      setLists((currentLists) =>
        sortLists(currentLists.map((list) => (list.id === nextList.id ? nextList : list))),
      );

      const savedList = await storeDb.updateList(nextList);

      return savedList;
    },
    [lists, storeDb],
  );

  const addSolve = useCallback(
    async (input: AddSolveInput) => {
      const existingSolves =
        input.listId === activeListId
          ? activeListSolveRecords
          : await storeDb.listSolves(input.listId);
      const record = makeTimerSolveRecord({
        input,
        solveIndex: getNextSolveIndex(input.listId, existingSolves),
      });

      if (input.listId === activeListId) {
        setActiveListSolveRecords((currentSolves) =>
          sortSolvesNewestFirst([record, ...currentSolves]),
        );
      }

      const savedRecord = await storeDb.addSolve(record);
      return savedRecord;
    },
    [activeListId, activeListSolveRecords, getNextSolveIndex, storeDb],
  );

  const updateSolvePenalty = useCallback(
    async (solveId: string, penalty: SolvePenalty) => {
      const updatedSolve = await storeDb.updateSolvePenalty(solveId, penalty);

      if (updatedSolve.sessionId === activeListId) {
        setActiveListSolveRecords((currentSolves) =>
          currentSolves.map((solve) => (solve.id === solveId ? updatedSolve : solve)),
        );
      }

      return updatedSolve;
    },
    [activeListId, storeDb],
  );

  const updateSolveMultiBlind = useCallback(
    async (
      solveId: string,
      multiBlind: MultiBlindSolveResult,
      penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
    ) => {
      const updatedSolve = await storeDb.updateSolveMultiBlind(solveId, multiBlind, penalty);

      if (updatedSolve.sessionId === activeListId) {
        setActiveListSolveRecords((currentSolves) =>
          currentSolves.map((solve) => (solve.id === solveId ? updatedSolve : solve)),
        );
      }

      return updatedSolve;
    },
    [activeListId, storeDb],
  );

  const updateSolveFewestMoves = useCallback(
    async (
      solveId: string,
      fewestMoves: FewestMovesSolveResult,
      penalty: Extract<SolvePenalty, 'none' | 'dnf'>,
    ) => {
      const updatedSolve = await storeDb.updateSolveFewestMoves(solveId, fewestMoves, penalty);

      if (updatedSolve.sessionId === activeListId) {
        setActiveListSolveRecords((currentSolves) =>
          currentSolves.map((solve) => (solve.id === solveId ? updatedSolve : solve)),
        );
      }

      return updatedSolve;
    },
    [activeListId, storeDb],
  );

  const deleteSolve = useCallback(
    async (solveId: string) => {
      await storeDb.deleteSolve(solveId);
      setActiveListSolveRecords((currentSolves) =>
        currentSolves.filter((solve) => solve.id !== solveId),
      );
    },
    [storeDb],
  );

  const value = useMemo<TimerSessionStoreContextValue>(
    () => ({
      activeList,
      activeListId,
      activeListSolveRecords,
      addSolve,
      createList,
      deleteSolve,
      error,
      isLoading,
      lists,
      retry: loadState,
      setActiveListId,
      updateList,
      updateSolveFewestMoves,
      updateSolveMultiBlind,
      updateSolvePenalty,
    }),
    [
      activeList,
      activeListId,
      activeListSolveRecords,
      addSolve,
      createList,
      deleteSolve,
      error,
      isLoading,
      lists,
      loadState,
      setActiveListId,
      updateList,
      updateSolveFewestMoves,
      updateSolveMultiBlind,
      updateSolvePenalty,
    ],
  );

  return (
    <TimerSessionStoreContext.Provider value={value}>{children}</TimerSessionStoreContext.Provider>
  );
};

export const useTimerSessionStore = (): TimerSessionStoreContextValue => {
  const value = useContext(TimerSessionStoreContext);
  if (value === undefined) {
    throw new Error('useTimerSessionStore must be used inside TimerSessionStoreProvider.');
  }

  return value;
};
