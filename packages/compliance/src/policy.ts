// The data-protection regime the tutor operates under: the ICO Age Appropriate
// Design Code (AADC) + UK-GDPR, encoded as data. This is the EXISTING regime (not
// a new one) made into a single source of truth that the helpers and the policy
// fixtures derive from. The reuse map in ARCHITECTURE.md points here.

export type DataCategory =
  | 'studentMessage' // free text the child typed — personal data
  | 'attachment' // handwriting image / its ref — personal data
  | 'trace' // orchestrator routing + verification trace — must be PII-free
  | 'auditLog'; // operational service logs

export type LawfulBasis = 'consent' | 'contract' | 'legitimate_interests' | 'legal_obligation';

export interface CategoryPolicy {
  /** Whether records of this category are personal data under UK-GDPR. */
  personalData: boolean;
  /** Days a record may be retained. 0 = ephemeral: not retained beyond the request. */
  retentionDays: number;
  lawfulBasis: LawfulBasis;
  description: string;
}

export const POLICY: Record<DataCategory, CategoryPolicy> = {
  studentMessage: {
    personalData: true,
    retentionDays: 0,
    lawfulBasis: 'legitimate_interests',
    description:
      'Child free text. Processed transiently for retrieval + the model; never persisted, never logged.',
  },
  attachment: {
    personalData: true,
    retentionDays: 0,
    lawfulBasis: 'consent',
    description:
      'Handwriting image. Held upstream only and deleted after OCR confirmation; the orchestrator sees a ref, never bytes, and never stores it.',
  },
  trace: {
    personalData: false,
    retentionDays: 30,
    lawfulBasis: 'legitimate_interests',
    description:
      'Routing + verification trace for the eval harness. Must contain no PII so it is safe to persist.',
  },
  auditLog: {
    personalData: false,
    retentionDays: 365,
    lawfulBasis: 'legal_obligation',
    description: 'Operational logs. PII (message text, client IP, headers) is redacted before write.',
  },
};

// Personal-data fields stripped from a record before it is logged or persisted
// (data minimisation). Keyed by record type.
export const MINIMISE_FIELDS: Record<string, string[]> = {
  studentTurn: ['message', 'attachmentRef'],
};

export const DAY_MS = 24 * 60 * 60 * 1000;
