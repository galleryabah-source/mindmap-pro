export type CreateWorkspaceInput = {
  name: string;
  slug: string;
};

export type WorkspaceApiProblem = {
  status: number;
  code: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCreateWorkspaceInput(value: unknown): CreateWorkspaceInput | null {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.slug !== "string") {
    return null;
  }

  const name = value.name.trim();
  const slug = value.slug.trim().toLowerCase();

  if (
    name.length < 1 ||
    name.length > 120 ||
    slug.length < 1 ||
    slug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return null;
  }

  return { name, slug };
}

export function mapWorkspaceDatabaseError(error: { code?: string } | null | undefined): WorkspaceApiProblem {
  switch (error?.code) {
    case "42501":
      return {
        status: 403,
        code: "FORBIDDEN",
        message: "Akun tidak memiliki izin untuk melakukan operasi ini.",
      };
    case "23505":
      return {
        status: 409,
        code: "WORKSPACE_SLUG_TAKEN",
        message: "Slug workspace sudah digunakan.",
      };
    case "22023":
    case "23514":
      return {
        status: 422,
        code: "INVALID_WORKSPACE_INPUT",
        message: "Nama atau slug workspace tidak valid.",
      };
    default:
      return {
        status: 500,
        code: "PERSISTENCE_ERROR",
        message: "Operasi workspace tidak dapat diselesaikan.",
      };
  }
}

export function isWorkspaceId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
