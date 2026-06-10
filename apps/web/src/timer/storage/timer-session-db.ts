import { WCA_EVENT_IDS } from '@cubegin/shared/wca';
import {
  createDefaultSession,
  sortSessionsByCreatedDesc,
  sortSolvesByCreatedDesc,
  type SolvePenalty,
  type SolveRecord,
  type SolveSession,
  type TimerSessionRepository,
} from '@cubegin/shared/timer-session';
import { createClientId } from './client-id';

const DB_NAME = 'cubegin-timer';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const SOLVE_STORE = 'solves';

const openTimerDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error('Failed to open timer database'));
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const sessions = db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        sessions.createIndex('createdAt', 'createdAt');
        sessions.createIndex('isDefault', 'isDefault');
        sessions.createIndex('eventId', 'eventId');
      }

      if (!db.objectStoreNames.contains(SOLVE_STORE)) {
        const solves = db.createObjectStore(SOLVE_STORE, { keyPath: 'id' });
        solves.createIndex('sessionId', 'sessionId');
        solves.createIndex('eventId', 'eventId');
        solves.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result);
  });

export const createIndexedDbTimerSessionRepository = async (): Promise<TimerSessionRepository> => {
  const db = await openTimerDb();
  const runTransaction = <T>(
    storeName: string,
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ) => run(db.transaction(storeName, mode).objectStore(storeName));

  const getAllSessions = () =>
    runTransaction(SESSION_STORE, 'readonly', async (store) =>
      sortSessionsByCreatedDesc((await requestToPromise(store.getAll())) as SolveSession[]),
    );

  const listSolves = (sessionId: string) =>
    runTransaction(SOLVE_STORE, 'readonly', async (store) => {
      const index = store.index('sessionId');
      const records = (await requestToPromise(index.getAll(sessionId))) as SolveRecord[];
      return sortSolvesByCreatedDesc(records);
    });

  return {
    async initializeDefaultSessions(now) {
      const existing = new Set((await getAllSessions()).map((session) => session.id));
      await runTransaction(SESSION_STORE, 'readwrite', async (store) => {
        await Promise.all(
          WCA_EVENT_IDS.map((eventId, index) => {
            const session = createDefaultSession(eventId, now + index);
            return existing.has(session.id)
              ? Promise.resolve(session.id)
              : requestToPromise(store.put(session));
          }),
        );
      });
      return getAllSessions();
    },
    async listSessions() {
      return getAllSessions();
    },
    async createSession(name, now, eventId) {
      const session: SolveSession = {
        id: createClientId(now),
        name,
        eventId,
        isDefault: false,
        createdAt: now,
      };
      await runTransaction(SESSION_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(session));
      });
      return session;
    },
    async deleteSession(sessionId) {
      const sessionSolves = await listSolves(sessionId);
      await runTransaction(SESSION_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.delete(sessionId));
      });
      await runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
        await Promise.all(sessionSolves.map((solve) => requestToPromise(store.delete(solve.id))));
      });
    },
    async listSolves(sessionId) {
      return listSolves(sessionId);
    },
    async addSolve(record) {
      await runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.put(record));
      });
      return record;
    },
    async updateSolvePenalty(solveId, penalty: SolvePenalty) {
      return runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
        const solve = (await requestToPromise(store.get(solveId))) as SolveRecord | undefined;
        if (!solve) throw new Error(`Solve not found: ${solveId}`);
        const updated = { ...solve, penalty };
        await requestToPromise(store.put(updated));
        return updated;
      });
    },
    async deleteSolve(solveId) {
      await runTransaction(SOLVE_STORE, 'readwrite', async (store) => {
        await requestToPromise(store.delete(solveId));
      });
    },
  };
};
