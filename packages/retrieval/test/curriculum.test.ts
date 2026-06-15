import { describe, expect, it } from 'vitest';
import { curriculumWhere } from '../src/curriculum.js';

describe('curriculumWhere', () => {
  it('returns TRUE with no params for an undefined filter', () => {
    const w = curriculumWhere(undefined);
    expect(w.sql).toContain('TRUE');
    expect(w.values).toEqual([]);
  });

  it('emits a containment fragment for board', () => {
    const w = curriculumWhere({ board: 'edexcel' });
    expect(w.sql).toContain('@>');
    expect(w.values).toEqual(['edexcel']);
  });

  it('ANDs board, level and specCode containment', () => {
    const w = curriculumWhere({ board: 'edexcel', level: 'alevel', specCode: '9MA0' });
    expect(w.sql).toContain('AND');
    expect(w.sql).toContain('@>');
    expect(w.values).toEqual(['edexcel', 'alevel', '9MA0']);
  });

  it('emits an overlap fragment for topicTags', () => {
    const w = curriculumWhere({ topicTags: ['integration', 'mechanics'] });
    expect(w.sql).toContain('&&');
    expect(w.values).toEqual(['integration', 'mechanics']);
  });

  it('combines containment AND overlap, params in order', () => {
    const w = curriculumWhere({ board: 'edexcel', topicTags: ['integration'] });
    expect(w.sql).toContain('@>');
    expect(w.sql).toContain('&&');
    expect(w.values).toEqual(['edexcel', 'integration']);
  });
});
