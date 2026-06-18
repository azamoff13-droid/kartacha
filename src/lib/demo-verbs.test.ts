import { describe, expect, it } from 'vitest';
import { DEMO_COMMON_VERBS } from './demo-verbs';

describe('common verbs demo seed', () => {
  it('contains exactly 100 unique translated verbs', () => {
    expect(DEMO_COMMON_VERBS).toHaveLength(100);
    expect(new Set(DEMO_COMMON_VERBS.map((card) => card.front)).size).toBe(100);
    expect(DEMO_COMMON_VERBS.every((card) => card.translation && card.pos === "fe'l")).toBe(true);
  });
});
