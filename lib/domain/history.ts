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
