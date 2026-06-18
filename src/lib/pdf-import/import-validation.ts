import { DECKS } from '../decks';
import { PDF_IMPORT_LIMITS, type PdfCardCandidate } from './types';
import { validateCandidateFields } from './vocabulary-parser';

export type CardImportInput = Pick<PdfCardCandidate, 'front' | 'translation' | 'pos' | 'example' | 'duplicateAction'>;

export function validateCardImportRequest(input: unknown) {
  if (!input || typeof input !== 'object') return { ok: false as const, message: 'Invalid payload.' };
  const body = input as { deckKey?: unknown; cards?: unknown };
  if (typeof body.deckKey !== 'string' || !DECKS[body.deckKey]) {
    return { ok: false as const, message: 'Unknown deck.' };
  }
  if (!Array.isArray(body.cards) || body.cards.length === 0 || body.cards.length > PDF_IMPORT_LIMITS.maxBatch) {
    return { ok: false as const, message: `Cards must contain 1-${PDF_IMPORT_LIMITS.maxBatch} items.` };
  }

  const cards: CardImportInput[] = [];
  for (const item of body.cards) {
    if (!item || typeof item !== 'object') return { ok: false as const, message: 'Invalid card.' };
    const value = item as Partial<CardImportInput>;
    const validation = validateCandidateFields({
      front: typeof value.front === 'string' ? value.front : '',
      translation: typeof value.translation === 'string' ? value.translation : '',
      pos: typeof value.pos === 'string' ? value.pos : '',
      example: typeof value.example === 'string' ? value.example : '',
    });
    if (validation.status !== 'valid') {
      return { ok: false as const, message: `Invalid card fields: ${[...validation.missing, ...validation.tooLong].join(', ')}.` };
    }
    if (value.duplicateAction !== undefined && value.duplicateAction !== 'skip' && value.duplicateAction !== 'update') {
      return { ok: false as const, message: 'Invalid duplicate action.' };
    }
    cards.push({ ...validation.fields, duplicateAction: value.duplicateAction || 'skip' });
  }
  return { ok: true as const, deckKey: body.deckKey, cards };
}
