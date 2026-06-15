# INTERFACES — Frozen Service Contracts

**Status: frozen. Read before every prompt. Changing a contract requires a
version bump and an explicit decision recorded here — not a feature prompt.**

All four services are built against these signatures. Implementations may change;
these shapes may not (without a version bump). Types are shown in TypeScript for
the Node side; the Python services expose the same shapes as JSON.

## 1. RetrievalService (grounding)

```ts
interface RetrievalQuery {
  text: string;
  curriculumFilter?: {
    board?: string;        // e.g. "edexcel"
    level?: "gcse" | "alevel";
    specCode?: string;     // e.g. "9MA0"
    topicTags?: string[];
  };
  k?: number;              // default 8
}

interface RetrievedChunk {
  text: string;
  citation: Citation;      // human-readable label + machine source ref
  curriculumTags: string[];
  provenance: Provenance;  // see CORPUS_POLICY.md
  score: number;
}

interface RetrievalResult {
  chunks: RetrievedChunk[];
  query: RetrievalQuery;
}

// retrieve(query: RetrievalQuery) -> RetrievalResult
```

## 2. VerificationService (truth)

```ts
type VerificationStatus = "correct" | "incorrect" | "indeterminate";

interface VerifyAnswerRequest {
  problemLatex: string;
  candidateAnswerLatex: string;
  domainHints?: Record<string, unknown>; // assumptions, variable domains
}

interface VerifyAnswerResult {
  status: VerificationStatus;
  canonicalAnswerLatex?: string;   // present when the service can produce it
  method: "sympy" | "numeric" | "cas";
  detail?: string;                 // internal only — never shown to students
}

interface VerifyStepRequest {
  problemLatex: string;
  priorStepsLatex: string[];
  stepLatex: string;
}

interface VerifyStepResult {
  status: VerificationStatus;
  detail?: string;                 // internal only
}

// verifyAnswer(req: VerifyAnswerRequest) -> VerifyAnswerResult
// verifyStep(req: VerifyStepRequest)     -> VerifyStepResult
```

## 3. DiagnosisService (marking)

```ts
interface MarkWorkingRequest {
  problemLatex: string;
  studentStepsLatex: string[];     // direct, or produced by OCR upstream
  markScheme?: MarkScheme;         // optional board mark scheme
  allowEcf?: boolean;              // default true
}

interface PerStepStatus {
  index: number;
  status: VerificationStatus;
  isFirstDivergence: boolean;
  carriedForward: boolean;         // accepted under ECF
}

interface MarkWorkingResult {
  marksAwarded: number;
  marksAvailable: number;
  firstDivergenceIndex: number | null;
  perStep: PerStepStatus[];
  ecfApplied: boolean;
}

// markWorking(req: MarkWorkingRequest) -> MarkWorkingResult
// The Mathpix two-pass OCR + confirmation path feeds studentStepsLatex (prompt 04).
```

## 4. TutorOrchestrator

```ts
type ClaimType = "curriculum" | "hint" | "full_solution" | "mark_working";

interface StudentTurn {
  message: string;
  problemId?: string;
  attachmentRef?: string;          // handwriting image, etc.
  mode?: "hint_only" | "full";
}

interface MathsClaim {
  text: string;
  verificationStatus: VerificationStatus | "not_a_correctness_claim";
  citations: Citation[];
}

interface TutorReply {
  reply: string;
  claimType: ClaimType;
  claims: MathsClaim[];            // every maths-bearing sentence, tagged
  citations: Citation[];
  trace: TurnTrace;                // retrieval hits, verification calls, routing
}

// handleTurn(turn: StudentTurn, sessionState: SessionState) -> TutorReply
```

## Shared types

```ts
interface Citation {
  label: string;                   // e.g. "Edexcel 9MA0 spec, section 6.2"
  sourceRef: string;               // machine id into the corpus
}

interface Provenance {
  sourceType: "spec" | "dfe_content_store" | "own_question_bank" | "own_authored";
  sourceId: string;
  licence: string;                 // must be present; gates ingestion
  ownership: "owned" | "licensed" | "public";
}
```

## The gating rule (enforced in the orchestrator, prompt 08)

Any `MathsClaim` whose `verificationStatus` is a correctness value
(`correct` / `incorrect` / `indeterminate`) **must** have been produced by a
service call recorded in the `trace`. A correctness-shaped sentence with status
`not_a_correctness_claim`, or one with no backing service call, is **stripped or
re-routed** before the reply is returned.
