import { createHash } from "node:crypto";

// stage_runs.input_hash: sha256 of the stage's inputs as canonical JSON (keys
// sorted at every level, so key order never changes the hash). What goes into
// each stage's inputs is listed in docs/ai.md#input-hash.

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
};

export const inputHash = (inputs: Record<string, unknown>): string =>
  createHash("sha256")
    .update(JSON.stringify(canonical(inputs)))
    .digest("hex");
