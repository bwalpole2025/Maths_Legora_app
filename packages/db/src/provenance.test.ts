import { describe, expect, it } from 'vitest';
import { assertProvenance } from './provenance';

describe('assertProvenance (CORPUS_POLICY provenance guard)', () => {
  it('rejects a chunk with no licence', () => {
    expect(() => assertProvenance({ ownership: 'owned' })).toThrow(/licence/i);
  });

  it('rejects a chunk with an empty or whitespace licence', () => {
    expect(() => assertProvenance({ licence: '', ownership: 'owned' })).toThrow(/licence/i);
    expect(() => assertProvenance({ licence: '   ', ownership: 'owned' })).toThrow(/licence/i);
  });

  it('rejects a chunk with no ownership', () => {
    expect(() => assertProvenance({ licence: 'OGL-3.0' })).toThrow(/ownership/i);
  });

  it('accepts a chunk carrying both a licence and an ownership value', () => {
    expect(() => assertProvenance({ licence: 'OGL-3.0', ownership: 'public' })).not.toThrow();
  });
});
