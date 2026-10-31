import { describe, expect, it } from "vitest";
import {
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
} from "../lib/domain/history";

describe("transactional history", () => {
  it("commits one transaction and supports undo then redo", () => {
    const initial = createHistory("A");
    const committed = commitHistory(initial, "B");
    const undone = undoHistory(committed);
    const redone = redoHistory(undone);

    expect(committed).toEqual({ past: ["A"], present: "B", future: [] });
    expect(undone).toEqual({ past: [], present: "A", future: ["B"] });
    expect(redone).toEqual({ past: ["A"], present: "B", future: [] });
  });

  it("clears redo history after a new branch is committed", () => {
    const state = commitHistory(undoHistory(commitHistory(createHistory(1), 2)), 3);
    expect(state).toEqual({ past: [1], present: 3, future: [] });
  });

  it("keeps only the configured number of past transactions", () => {
    let state = createHistory(0);
    for (let value = 1; value <= 5; value += 1) {
      state = commitHistory(state, value, 2);
    }
    expect(state.past).toEqual([3, 4]);
    expect(state.present).toBe(5);
  });

  it("returns the same state when undo or redo is unavailable", () => {
    const state = createHistory("unchanged");
    expect(undoHistory(state)).toBe(state);
    expect(redoHistory(state)).toBe(state);
  });

  it("rejects an invalid history limit", () => {
    expect(() => commitHistory(createHistory(1), 2, 0)).toThrow(/positif/);
  });
});
