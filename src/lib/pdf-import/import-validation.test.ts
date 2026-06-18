import { describe, expect, it } from 'vitest';
import { validateCardImportRequest } from './import-validation';

describe('card import validation', () => {
  const card = { front: '사랑', translation: 'sevgi', pos: 'ot' };

  it('rejects unknown decks and oversized batches', () => {
    expect(validateCardImportRequest({ deckKey: 'xx', cards: [card] }).ok).toBe(false);
    expect(validateCardImportRequest({ deckKey: 'ko', cards: Array.from({ length: 101 }, () => card) }).ok).toBe(false);
  });

  it('requires front, translation, and part of speech', () => {
    expect(validateCardImportRequest({ deckKey: 'ko', cards: [{ ...card, pos: '' }] }).ok).toBe(false);
  });

  it('normalizes valid imports', () => {
    expect(validateCardImportRequest({ deckKey: 'ko', cards: [{ ...card, front: '  사랑  ', duplicateAction: 'update' }] })).toMatchObject({
      ok: true,
      cards: [{ front: '사랑', duplicateAction: 'update' }],
    });
  });
});
