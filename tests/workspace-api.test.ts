import { describe, expect, it } from "vitest";
import {
  isWorkspaceId,
  mapWorkspaceDatabaseError,
  parseCreateWorkspaceInput,
} from "@/lib/server/workspace-api";

describe("workspace API contract", () => {
  it("normalizes a valid workspace name and slug", () => {
    expect(parseCreateWorkspaceInput({ name: "  Team Workspace  ", slug: " Team-Workspace " })).toEqual({
      name: "Team Workspace",
      slug: "team-workspace",
    });
  });

  it("rejects invalid names, slugs and non-object input", () => {
    expect(parseCreateWorkspaceInput(null)).toBeNull();
    expect(parseCreateWorkspaceInput({ name: " ", slug: "team" })).toBeNull();
    expect(parseCreateWorkspaceInput({ name: "x".repeat(121), slug: "team" })).toBeNull();
    expect(parseCreateWorkspaceInput({ name: "Team", slug: "two words" })).toBeNull();
    expect(parseCreateWorkspaceInput({ name: "Team", slug: "-team-" })).toBeNull();
  });

  it("validates the RPC workspace identifier", () => {
    expect(isWorkspaceId("00000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isWorkspaceId("not-a-uuid")).toBe(false);
    expect(isWorkspaceId(null)).toBe(false);
  });

  it("maps authorization, uniqueness and validation failures safely", () => {
    expect(mapWorkspaceDatabaseError({ code: "42501" })).toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mapWorkspaceDatabaseError({ code: "23505" })).toMatchObject({ status: 409, code: "WORKSPACE_SLUG_TAKEN" });
    expect(mapWorkspaceDatabaseError({ code: "22023" })).toMatchObject({ status: 422, code: "INVALID_WORKSPACE_INPUT" });
    expect(mapWorkspaceDatabaseError({ code: "XX000" })).toMatchObject({
      status: 500,
      message: "Operasi workspace tidak dapat diselesaikan.",
    });
  });
});
