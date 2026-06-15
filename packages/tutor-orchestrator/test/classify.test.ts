import { describe, expect, it } from 'vitest';
import { classifyTurn } from '../src/classify.js';

describe('classifyTurn — one branch per ClaimType', () => {
  it('routes a marking request (or a handwriting attachment) to mark_working', () => {
    expect(classifyTurn({ message: 'Can you mark my working?' })).toBe('mark_working');
    expect(classifyTurn({ message: 'How many marks does this get?' })).toBe('mark_working');
    expect(classifyTurn({ message: 'here it is', attachmentRef: 'img-1' })).toBe('mark_working');
  });

  it('routes a hint request, or hint_only mode, to hint', () => {
    expect(classifyTurn({ message: 'Give me a hint to get started.' })).toBe('hint');
    expect(classifyTurn({ message: "I'm stuck — where do I begin?" })).toBe('hint');
    expect(classifyTurn({ message: 'Solve this for me', mode: 'hint_only' })).toBe('hint');
  });

  it('routes an answer/solution request to full_solution', () => {
    expect(classifyTurn({ message: 'Solve this integral for me.' })).toBe('full_solution');
    expect(classifyTurn({ message: 'Is 3/2 the answer?' })).toBe('full_solution');
    expect(classifyTurn({ message: 'go', problemId: 'q1', mode: 'full' })).toBe('full_solution');
  });

  it('defaults to curriculum for explanatory / scope questions', () => {
    expect(classifyTurn({ message: 'Is integration by parts on the Edexcel spec?' })).toBe(
      'curriculum',
    );
    expect(classifyTurn({ message: 'Explain why we add a constant of integration.' })).toBe(
      'curriculum',
    );
  });
});
