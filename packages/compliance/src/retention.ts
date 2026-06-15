// Retention + data-minimisation helpers, driven by POLICY. No persistence layer
// exists yet (the trace is consumed in-memory by the eval harness); these are the
// tested primitives a persistence/erasure job will call when it lands.

import { DAY_MS, MINIMISE_FIELDS, POLICY, type DataCategory } from './policy.js';

export function retentionDays(category: DataCategory): number {
  return POLICY[category].retentionDays;
}

/** When a record of this category must be deleted by. retentionDays 0 => createdAt
 *  (ephemeral: not retained beyond the request). */
export function expiresAt(category: DataCategory, createdAtMs: number): number {
  return createdAtMs + retentionDays(category) * DAY_MS;
}

export function isExpired(category: DataCategory, createdAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAt(category, createdAtMs);
}

/** Drop the named personal-data fields from a record (minimisation) before it is
 *  logged or persisted. */
export function minimise<T extends Record<string, unknown>>(record: T, fields: string[]): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(record)) {
    if (!fields.includes(k)) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** A log-/persist-safe view of a StudentTurn: message + attachmentRef removed. */
export function minimiseStudentTurn<T extends Record<string, unknown>>(turn: T): Partial<T> {
  return minimise(turn, MINIMISE_FIELDS.studentTurn);
}
