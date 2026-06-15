// The four headline metrics. Each drives the REAL handleTurn over realistic
// sessions and inspects the gated TutorReply + trace. The eval measures; it never
// modifies a service to pass.

import type { MathsClaim, TutorReply } from '@imaia/contracts';

import { createOrchestrator } from '../orchestrator.js';
import { referenceModelClient } from '../model-reference.js';
import type { ModelClient } from '../model.js';
import type { TurnTrace } from '../types.js';
import {
  CURRICULUM_CASES,
  evalChunk,
  HINT_CASES,
  MARKING_CASES,
  SOLUTION_CASES,
} from './fixtures.js';
import { leakyHintModel, type ResolvedServices, SeededRetrieval } from './services.js';
import type { CaseResult } from './types.js';

function orchestrator(services: ResolvedServices, chunks = [evalChunk()], model: ModelClient = referenceModelClient) {
  return createOrchestrator({
    retrieval: new SeededRetrieval(chunks),
    verification: services.verification,
    diagnosis: services.diagnosis,
    model,
  });
}

const traceOf = (reply: TutorReply): TurnTrace => reply.trace as TurnTrace;
const correctnessClaims = (reply: TutorReply): MathsClaim[] =>
  reply.claims.filter((c) => c.verificationStatus !== 'not_a_correctness_claim');

/** 1. Served-solution correctness — served maths matches the verified result, and
 *  every correctness claim is backed by a verification call in the trace. LIVE only
 *  (it cross-checks against the real verifier). */
export async function servedSolutionCorrectness(services: ResolvedServices): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of SOLUTION_CASES) {
    const id = c.id;
    try {
      const o = orchestrator(services, c.seededChunks);
      const reply = await o.handleTurn(
        { message: `Is $${c.candidateAnswerLatex}$ the answer to $${c.problemLatex}$?`, mode: 'full' },
        { problem: { problemLatex: c.problemLatex }, candidateAnswerLatex: c.candidateAnswerLatex },
      );

      // Ground truth straight from the real verifier.
      const truth = await services.verification.verifyAnswer({
        problemLatex: c.problemLatex,
        candidateAnswerLatex: c.candidateAnswerLatex,
      });

      const claims = correctnessClaims(reply);
      const backed = traceOf(reply).verificationCalls.some(
        (v) => v.kind === 'verifyAnswer' && v.status === truth.status,
      );
      const allMatchVerified = claims.length > 0 && claims.every((x) => x.verificationStatus === truth.status);
      const canonicalEchoed = !truth.canonicalAnswerLatex || reply.reply.includes(truth.canonicalAnswerLatex);
      const verifierAgreesLabel = truth.status === c.expectedStatus;

      const passed = verifierAgreesLabel && allMatchVerified && backed && canonicalEchoed;
      const note = !verifierAgreesLabel
        ? `verifier returned ${truth.status}, fixture expected ${c.expectedStatus}`
        : !allMatchVerified
          ? `served claim status != verified ${truth.status}`
          : !backed
            ? 'no verifyAnswer call in trace backing the served claim'
            : !canonicalEchoed
              ? 'reply did not echo the verified canonical answer'
              : 'served == verified, trace-backed';
      out.push({
        id,
        metric: 'servedSolutionCorrectness',
        passed,
        expected: c.expectedStatus,
        actual: claims.map((x) => x.verificationStatus).join(',') || 'none',
        note,
      });
    } catch (err) {
      out.push({ id, metric: 'servedSolutionCorrectness', passed: false, expected: c.expectedStatus, actual: 'error', note: String(err) });
    }
  }
  return out;
}

/** 2. Curriculum-scope adherence — claims stay within retrieved scope and cite;
 *  with nothing retrieved, the tutor makes no claim and fabricates no citation. */
export async function curriculumAdherence(services: ResolvedServices): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of CURRICULUM_CASES) {
    try {
      const o = orchestrator(services, c.seededChunks);
      const reply = await o.handleTurn({ message: c.message }, {});
      const hits = new Set(traceOf(reply).retrievalHits);

      const noFabricatedCites = reply.claims.every((cl) => cl.citations.every((cit) => hits.has(cit.sourceRef)));
      const noCorrectness = reply.claims.every((cl) => cl.verificationStatus === 'not_a_correctness_claim');

      let passed: boolean;
      let note: string;
      if (c.expectScopeRefusal) {
        passed = noFabricatedCites && reply.claims.length === 0;
        note = passed ? 'no claim / no citation when nothing retrieved' : `expected no claim, got ${reply.claims.length}`;
      } else {
        const cited = reply.claims.length > 0 && reply.claims.every((cl) => cl.citations.length > 0);
        passed = noFabricatedCites && noCorrectness && cited;
        note = !noFabricatedCites
          ? 'a claim cited a non-retrieved source'
          : !noCorrectness
            ? 'a curriculum claim asserted correctness'
            : !cited
              ? 'a curriculum claim was made without a citation'
              : 'grounded + cited, in scope';
      }
      out.push({
        id: c.id,
        metric: 'curriculumAdherence',
        passed,
        expected: c.expectScopeRefusal ? 'no-claim' : 'grounded+cited',
        actual: `${reply.claims.length} claim(s), ${reply.citations.length} citation(s)`,
        note,
      });
    } catch (err) {
      out.push({ id: c.id, metric: 'curriculumAdherence', passed: false, expected: 'grounded+cited', actual: 'error', note: String(err) });
    }
  }
  return out;
}

/** 3. Marking accuracy — markWorking vs a human marker. LIVE only. */
export async function markingAccuracy(services: ResolvedServices): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of MARKING_CASES) {
    const expected = `${c.expected.marksAwarded}/${c.expected.marksAvailable} fdi=${c.expected.firstDivergenceIndex}`;
    try {
      const result = await services.diagnosis.markWorking({
        problemLatex: c.problemLatex,
        studentStepsLatex: c.studentStepsLatex,
        markScheme: c.markScheme,
      });

      // End-to-end routing: a 'how many marks' turn reaches the diagnosis service.
      const reply = await orchestrator(services).handleTurn(
        { message: 'How many marks does my working get?' },
        { problem: { problemLatex: c.problemLatex }, studentStepsLatex: c.studentStepsLatex, markScheme: c.markScheme },
      );
      const routed =
        reply.claimType === 'mark_working' &&
        traceOf(reply).verificationCalls.some((v) => v.kind === 'markWorking');

      const matches =
        result.marksAwarded === c.expected.marksAwarded &&
        result.marksAvailable === c.expected.marksAvailable &&
        result.firstDivergenceIndex === c.expected.firstDivergenceIndex;

      const actual = `${result.marksAwarded}/${result.marksAvailable} fdi=${result.firstDivergenceIndex}`;
      out.push({
        id: c.id,
        metric: 'markingAccuracy',
        passed: matches && routed,
        expected,
        actual,
        note: !matches ? 'marks differ from the human marker' : !routed ? 'turn did not route to diagnosis' : 'matches human marker',
      });
    } catch (err) {
      out.push({ id: c.id, metric: 'markingAccuracy', passed: false, expected, actual: 'error', note: String(err) });
    }
  }
  return out;
}

/** 4. Hint quality — advance without revealing the answer (incl. an adversarial
 *  model that tries to leak it; the hint_only gate must strip it). Both modes. */
export async function hintQuality(services: ResolvedServices): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of HINT_CASES) {
    try {
      const model = c.leaky ? leakyHintModel(c.knownAnswer) : referenceModelClient;
      const o = orchestrator(services, c.seededChunks, model);
      const reply = await o.handleTurn(
        { message: c.message, mode: 'hint_only' },
        { problem: { problemLatex: c.problemLatex } },
      );

      const leaked =
        reply.reply.includes(c.knownAnswer) || reply.claims.some((cl) => cl.text.includes(c.knownAnswer));
      const advances = reply.reply.trim().length > 0;
      // A non-adversarial hint must advance AND not leak; a suppressed adversarial
      // hint just must not leak (its only claim was the leak, correctly stripped).
      const passed = !leaked && (c.leaky || advances);
      out.push({
        id: c.id,
        metric: 'hintQuality',
        passed,
        expected: 'no-leak',
        actual: leaked ? 'leaked-answer' : advances ? 'advanced' : 'empty',
        note: leaked ? 'the hint revealed the decisive answer' : c.leaky ? 'adversarial leak stripped by the gate' : 'advanced without revealing the answer',
      });
    } catch (err) {
      out.push({ id: c.id, metric: 'hintQuality', passed: false, expected: 'no-leak', actual: 'error', note: String(err) });
    }
  }
  return out;
}
