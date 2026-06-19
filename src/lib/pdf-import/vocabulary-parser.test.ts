import { describe, expect, it } from 'vitest';
import { markDuplicateCandidates, normalizeVocabularyText, parseVocabularyPages, refreshCandidate } from './vocabulary-parser';
import type { PdfTextPage } from './types';

function line(pageNumber: number, y: number, values: Array<[string, number, number]>): PdfTextPage {
  return { pageNumber, items: values.map(([str, x, width]) => ({ str, x, y, width })) };
}

describe('vocabulary parser', () => {
  it('normalizes whitespace and Unicode to NFC', () => {
    expect(normalizeVocabularyText('  cafe\u0301   so‘z  ')).toBe('café so‘z');
  });

  it('parses em dash and colon rows', () => {
    const page: PdfTextPage = {
      pageNumber: 1,
      items: [
        ...line(1, 100, [['사랑 — sevgi — ot — 사랑은 중요하다.', 10, 310]]).items,
        ...line(1, 80, [['abundant: mo‘l: adj.', 10, 220]]).items,
      ],
    };
    const { candidates } = parseVocabularyPages([page]);
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ front: '사랑', translation: 'sevgi', pos: 'ot', status: 'valid' });
    expect(candidates[1]).toMatchObject({ front: 'abundant', translation: 'mo‘l', pos: 'adj.', status: 'valid' });
  });

  it('parses coordinate-separated table columns', () => {
    const page = line(1, 100, [['학교', 10, 32], ['maktab', 120, 48], ['ot', 240, 16], ['학교에 가요.', 310, 90]]);
    const { candidates } = parseVocabularyPages([page]);
    expect(candidates[0]).toMatchObject({ front: '학교', translation: 'maktab', pos: 'ot', example: '학교에 가요.' });
  });

  it('rejects multi-column numbered word-only lists', () => {
    const page = line(1, 100, [['1. be', 10, 32], ['45. hear', 180, 48], ['90. serve', 360, 56]]);
    expect(parseVocabularyPages([page]).candidates).toHaveLength(0);
  });

  it('removes repeated margins and page numbers', () => {
    const pages = [1, 2].map((pageNumber) => ({
      pageNumber,
      items: [
        ...line(pageNumber, 500, [['My Dictionary', 10, 100]]).items,
        ...line(pageNumber, 300, [[`word${pageNumber} — tarjima — ot`, 10, 220]]).items,
        ...line(pageNumber, 10, [[String(pageNumber), 10, 10]]).items,
      ],
    }));
    expect(parseVocabularyPages(pages).candidates.map((item) => item.front)).toEqual(['word1', 'word2']);
  });

  it('marks incomplete rows and makes them valid after editing', () => {
    const candidate = parseVocabularyPages([line(1, 100, [['word — tarjima', 10, 120]])]).candidates[0];
    expect(candidate.status).toBe('incomplete');
    expect(refreshCandidate({ ...candidate, pos: 'ot', selected: true }).status).toBe('valid');
  });

  it('marks normalized duplicates without crossing an external deck boundary', () => {
    const candidate = { ...parseVocabularyPages([line(1, 100, [['CAFÉ — qahva — ot', 10, 170]])]).candidates[0] };
    const [duplicate] = markDuplicateCandidates([candidate], ['cafe\u0301']);
    expect(duplicate).toMatchObject({ status: 'duplicate', selected: false, duplicateAction: 'skip' });
  });

  it('stops at the candidate limit', () => {
    const page: PdfTextPage = {
      pageNumber: 1,
      items: Array.from({ length: 5 }, (_, index) => ({ str: `w${index} — t${index} — ot`, x: 10, y: 100 - index * 10, width: 150 })),
    };
    const result = parseVocabularyPages([page], 3);
    expect(result.candidates).toHaveLength(3);
    expect(result.limited).toBe(true);
  });
});
