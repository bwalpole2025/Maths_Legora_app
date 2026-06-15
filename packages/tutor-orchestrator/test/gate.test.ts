import { describe, expect, it } from 'vitest';
import { gateClaims } from '../src/gate.js';
import type { VerifiedFact } from '../src/model.js';
import { chunk } from './fakes.js';

const chunks = [chunk()];
const verifiedCorrect: VerifiedFact = {
  kind: 'verifyAnswer',
  result: { status: 'correct', canonicalAnswerLatex: 'x^2 + 2x + 1', method: 'sympy' },
};

describe('gateClaims — the correctness gate', () => {
  it('strips an unverified correctness claim from both claims and reply', () => {
    const out = gateClaims({
      modelClaims: [{ text: 'The answer is 5.', assertsCorrectness: true, citationRefs: [] }],
      claimType: 'full_solution',
      verified: undefined,
      mode: 'full',
      chunks,
    });
    expect(out.claims).toHaveLength(0);
    expect(out.reply).not.toContain('The answer is 5.');
    expect(out.reply).toBe('');
  });

  it('keeps a backed correctness claim, stamping the SERVICE status (not the model)', () => {
    const out = gateClaims({
      modelClaims: [
        {
          text: 'Your answer matches the verified result.',
          assertsCorrectness: true,
          citationRefs: ['edexcel-9ma0#6.2'],
        },
      ],
      claimType: 'full_solution',
      verified: verifiedCorrect,
      mode: 'full',
      chunks,
    });
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0].verificationStatus).toBe('correct');
    expect(out.claims[0].citations[0]?.sourceRef).toBe('edexcel-9ma0#6.2');
  });

  it('strips a correctness-shaped sentence mislabeled as not_a_correctness_claim', () => {
    const out = gateClaims({
      modelClaims: [
        { text: 'So the answer is 42.', assertsCorrectness: false, citationRefs: ['edexcel-9ma0#6.2'] },
      ],
      claimType: 'curriculum',
      verified: undefined,
      mode: 'full',
      chunks,
    });
    expect(out.claims).toHaveLength(0);
  });

  it('hint_only never reveals a decisive result, even with a verification present', () => {
    const out = gateClaims({
      modelClaims: [
        {
          text: 'Your answer matches the verified result.',
          assertsCorrectness: true,
          citationRefs: ['edexcel-9ma0#6.2'],
        },
      ],
      claimType: 'hint',
      verified: verifiedCorrect,
      mode: 'hint_only',
      chunks,
    });
    expect(out.claims).toHaveLength(0);
  });

  it('requires a curriculum claim to cite a retrieved chunk', () => {
    const out = gateClaims({
      modelClaims: [
        {
          text: 'Integration by parts reverses the product rule.',
          assertsCorrectness: false,
          citationRefs: [],
        },
      ],
      claimType: 'curriculum',
      verified: undefined,
      mode: 'full',
      chunks,
    });
    expect(out.claims).toHaveLength(0);
  });

  it('keeps a grounded explanatory claim tagged not_a_correctness_claim', () => {
    const out = gateClaims({
      modelClaims: [
        {
          text: 'Integration by parts reverses the product rule.',
          assertsCorrectness: false,
          citationRefs: ['edexcel-9ma0#6.2'],
        },
      ],
      claimType: 'curriculum',
      verified: undefined,
      mode: 'full',
      chunks,
    });
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0].verificationStatus).toBe('not_a_correctness_claim');
    expect(out.reply).toContain('product rule');
  });
});
