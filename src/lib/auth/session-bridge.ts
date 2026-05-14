/**
 * Serializable session projection for client context (no secrets).
 * Shape intentionally small — extend when RBAC/session fields are defined.
 */
export type SessionBridge = {
  userId: string;
  email: string | null;
  name: string | null;
} | null;

export function toSessionBridge(session: unknown): SessionBridge {
  if (!session || typeof session !== "object") {
    return null;
  }
  const record = session as {
    user?: { id?: string; email?: string | null; name?: string | null };
  };
  const id = record.user?.id;
  if (!id) {
    return null;
  }
  return {
    userId: id,
    email: record.user?.email ?? null,
    name: record.user?.name ?? null,
  };
}
