import type { SolvePenalty, SolveRecord } from '@cubegin/shared/timer-session';
import type { TimerList, TimerSessionDb } from './timer-session-store';

const DB_NAME = 'cubegin-timer-session';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const SOLVE_STORE = 'solves';
const META_STORE = 'meta';
const ACTIVE_LIST_KEY = 'activeListId';

interface MetaRecord {
  key: string;
  value: string;
}

const sortLists = (lists: readonly TimerList[]): TimerList[] =>
  [...lists].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

const getSolveOrdinalFromId = (solveId: string): number => {
  const ordinalText = solveId.slice(solveId.lastIndexOf(':') + 1);
  const ordinal = Number(ordinalText);
  return Number.isFinite(ordinal) ? ordinal : 0;
};

const sortSolvesNewestFirst = (solves: readonly SolveRecord[]): SolveRecord[] =>
  [...solves].sort(
    (a, b) => b.createdAt - a.createdAt || getSolveOrdinalFromId(b.id) - getSolveOrdinalFromId(a.id),
  );

const cloneList = (list: TimerList): TimerList => ({ ...list });

const cloneSolve = (solve: SolveRecord): SolveRecord => ({
  ...solve,
  scramble: Array.isArray(solve.scramble) ? [...solve.scramble] : solve.scramble,
});

export const createMemoryTimerSessionDb = (): TimerSessionDb => {
  const listsById = new Map<string, TimerList>();
  const solvesById = new Map<string, SolveRecord>();
  let activeListId: string | undefined;

  return {
    async initialize(defaultLists) {
      defaultLists.forEach((list) => {
        if (!listsById.has(list.id)) {
          listsById.set(list.id, cloneList(list));
        }
      });

      activeListId ??= defaultLists[0]?.id;
    },
    async listSessions() {
      return sortLists([...listsById.values()].map(cloneList));
    },
    async getActiveListId() {
      return activeListId;
    },
    async setActiveListId(listId) {
      activeListId = listId;
    },
    async updateList(list) {
      const nextList = cloneList(list);
      listsById.set(nextList.id, nextList);
      return cloneList(nextList);
    },
    async listSolves(listId) {
      return sortSolvesNewestFirst(
        [...solvesById.values()]
          .filter((solve) => solve.sessionId === listId)
          .map((solve) => cloneSolve(solve)),
      );
    },
    async addSolve(record) {
      const nextRecord = cloneSolve(record);
      solvesById.set(nextRecord.id, nextRecord);
      return cloneSolve(nextRecord);
    },
    async updateSolvePenalty(solveId, penalty) {
      const solve = solvesById.get(solveId);
      if (solve === undefined) {
        throw new Error(`Solve not found: ${solveId}`);
      }

      const nextSolve: SolveRecord = { ...solve, penalty };
      solvesById.set(solveId, nextSolve);
      return cloneSolve(nextSolve);
    },
    async deleteSolve(solveId) {
      solvesById.delete(solveId);
    },
  };
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    request.onsuccess = () => resolve(request.result);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.oncomplete = () => resolve();
  });

const createSchema = (db: IDBDatabase) => {
  if (!db.objectStoreNames.contains(SESSION_STORE)) {
    const sessions = db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
    sessions.createIndex('createdAt', 'createdAt');
    sessions.createIndex('eventId', 'scrambleTypeId');
    sessions.createIndex('isDefault', 'isDefault');
  }

  if (!db.objectStoreNames.contains(SOLVE_STORE)) {
    const solves = db.createObjectStore(SOLVE_STORE, { keyPath: 'id' });
    solves.createIndex('createdAt', 'createdAt');
    solves.createIndex('eventId', 'eventId');
    solves.createIndex('sessionId', 'sessionId');
  }

  if (!db.objectStoreNames.contains(META_STORE)) {
    db.createObjectStore(META_STORE, { keyPath: 'key' });
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable, so local solve history cannot be loaded.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    request.onupgradeneeded = () => createSchema(request.result);
    request.onsuccess = () => resolve(request.result);
  });

const runTransaction = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> => {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(storeName, mode);
    const result = await run(transaction.objectStore(storeName));
    await transactionDone(transaction);
    return result;
  } finally {
    db.close();
  }
};

const runStorePairTransaction = async <T>(
  storeNames: readonly string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> => {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(storeNames, mode);
    const result = await run(transaction);
    await transactionDone(transaction);
    return result;
  } finally {
    db.close();
  }
};

export const createIndexedDbTimerSessionDb = (): TimerSessionDb => ({
  async initialize(defaultLists) {
    const existingLists = await this.listSessions();
    const existingIds = new Set(existingLists.map((list) => list.id));

    await Promise.all(
      defaultLists
        .filter((list) => !existingIds.has(list.id))
        .map((list) => this.updateList(list)),
    );

    const activeListId = await this.getActiveListId();
    if (activeListId === undefined && defaultLists[0] !== undefined) {
      await this.setActiveListId(defaultLists[0].id);
    }
  },
  async listSessions() {
    return runTransaction(SESSION_STORE, 'readonly', async (store) =>
      sortLists((await requestToPromise(store.getAll())) as TimerList[]),
    );
  },
  async getActiveListId() {
    return runTransaction(META_STORE, 'readonly', async (store) => {
      const record = (await requestToPromise(store.get(ACTIVE_LIST_KEY))) as MetaRecord | undefined;
      return record?.value;
    });
  },
  async setActiveListId(listId) {
    await runTransaction(META_STORE, 'readwrite', async (store) => {
      store.put({ key: ACTIVE_LIST_KEY, value: listId } satisfies MetaRecord);
    });
  },
  async updateList(list) {
    const nextList = cloneList(list);
    await runTransaction(SESSION_STORE, 'readwrite', async (store) => {
      store.put(nextList);
    });
    return cloneList(nextList);
  },
  async listSolves(listId) {
    return runTransaction(SOLVE_STORE, 'readonly', async (store) =>
      sortSolvesNewestFirst(
        (await requestToPromise(store.index('sessionId').getAll(listId))) as SolveRecord[],
      ),
    );
  },
  async addSolve(record) {
    const nextRecord = cloneSolve(record);
    await runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
      store.put(nextRecord);
    });
    return cloneSolve(nextRecord);
  },
  async updateSolvePenalty(solveId: string, penalty: SolvePenalty) {
    return runStorePairTransaction([SOLVE_STORE], 'readwrite', async (transaction) => {
      const store = transaction.objectStore(SOLVE_STORE);
      const solve = (await requestToPromise(store.get(solveId))) as SolveRecord | undefined;

      if (solve === undefined) {
        throw new Error(`Solve not found: ${solveId}`);
      }

      const nextSolve: SolveRecord = { ...solve, penalty };
      store.put(nextSolve);

      return cloneSolve(nextSolve);
    });
  },
  async deleteSolve(solveId) {
    await runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
      store.delete(solveId);
    });
  },
});
