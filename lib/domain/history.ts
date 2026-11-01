export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const DEFAULT_HISTORY_LIMIT = 100;

export function createHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] };
}

/** Commits one completed user transaction and invalidates the redo branch. */
export function commitHistory<T>(
  state: HistoryState<T>,
  next: T,
  limit = DEFAULT_HISTORY_LIMIT,
): HistoryState<T> {
  if (Object.is(state.present, next)) return state;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Batas riwayat harus berupa bilangan bulat positif.");
  }
  return {
    past: [...state.past, state.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state;
  return {
    past: state.past.slice(0, -1),
    present: state.past[state.past.length - 1],
    future: [state.present, ...state.future],
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state;
  return {
    past: [...state.past, state.present],
    present: state.future[0],
    future: state.future.slice(1),
  };
}

/** Records the current snapshot before a UI mutation begins. */
export function recordHistorySnapshot<T>(
  state: HistoryState<T>,
  snapshot: T,
  limit = DEFAULT_HISTORY_LIMIT,
  equals: (left: T, right: T) => boolean = Object.is,
): HistoryState<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Batas riwayat harus berupa bilangan bulat positif.");
  }
  const last = state.past[state.past.length - 1];
  if (last !== undefined && equals(last, snapshot)) return state;
  return {
    ...state,
    past: [...state.past, snapshot].slice(-limit),
    future: [],
  };
}

/** Synchronizes the live editor snapshot without creating a new undo step. */
export function syncHistoryPresent<T>(
  state: HistoryState<T>,
  present: T,
): HistoryState<T> {
  if (Object.is(state.present, present)) return state;
  return { ...state, present };
}
