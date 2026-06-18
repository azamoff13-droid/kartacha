import { PDF_IMPORT_LIMITS, type PdfCardCandidate, type PdfTextItem, type PdfTextPage } from './types';

type VisualRow = {
  pageNumber: number;
  sourceLine: number;
  y: number;
  items: PdfTextItem[];
  text: string;
};

const POS_WORDS = new Set([
  'adj', 'adj.', 'adjective', 'adv', 'adv.', 'adverb', 'verb', 'v', 'v.', 'noun', 'n', 'n.',
  'pronoun', 'prep', 'preposition', 'conj', 'interj', 'ot', 'sifat', 'fe’l', "fe'l", 'ravish',
  'olmosh', 'ko‘makchi', "ko'makchi", 'bog‘lovchi', "bog'lovchi", 'ibora', 'son', 'undov',
]);

export function normalizeVocabularyText(value: string) {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function normalizeDuplicateKey(value: string, locale?: string) {
  const normalized = normalizeVocabularyText(value);
  return locale ? normalized.toLocaleLowerCase(locale) : normalized.toLocaleLowerCase();
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function validateCandidateFields(input: Pick<PdfCardCandidate, 'front' | 'translation' | 'pos' | 'example'>) {
  const front = normalizeVocabularyText(input.front);
  const translation = normalizeVocabularyText(input.translation);
  const pos = normalizeVocabularyText(input.pos);
  const example = normalizeVocabularyText(input.example || '');
  const missing = [!front && 'front', !translation && 'translation', !pos && 'pos'].filter(Boolean) as string[];
  const tooLong = [
    front.length > PDF_IMPORT_LIMITS.front && 'front',
    translation.length > PDF_IMPORT_LIMITS.translation && 'translation',
    pos.length > PDF_IMPORT_LIMITS.pos && 'pos',
    example.length > PDF_IMPORT_LIMITS.example && 'example',
  ].filter(Boolean) as string[];

  return {
    fields: { front, translation, pos, example: example || undefined },
    missing,
    tooLong,
    status: tooLong.length ? 'invalid' as const : missing.length ? 'incomplete' as const : 'valid' as const,
  };
}

export function refreshCandidate(candidate: PdfCardCandidate): PdfCardCandidate {
  const validation = validateCandidateFields(candidate);
  const status = candidate.status === 'duplicate' && validation.status === 'valid'
    ? 'duplicate'
    : validation.status;
  return {
    ...candidate,
    ...validation.fields,
    status,
    selected: status === 'valid' ? candidate.selected : status === 'duplicate' && candidate.duplicateAction === 'update' ? candidate.selected : false,
  };
}

export function markDuplicateCandidates(
  candidates: PdfCardCandidate[],
  existingFronts: string[],
  locale?: string,
) {
  const existing = new Set(existingFronts.map((front) => normalizeDuplicateKey(front, locale)));
  const seen = new Set<string>();

  return candidates.map((candidate) => {
    const key = normalizeDuplicateKey(candidate.front, locale);
    if (candidate.status === 'valid' && key && (existing.has(key) || seen.has(key))) {
      return { ...candidate, status: 'duplicate' as const, selected: false, duplicateAction: 'skip' as const };
    }
    if (candidate.status === 'valid' && key) seen.add(key);
    return candidate;
  });
}

export function clusterTextItems(page: PdfTextPage, tolerance = 4): VisualRow[] {
  const sorted = page.items
    .filter((item) => normalizeVocabularyText(item.str))
    .sort((a, b) => Math.abs(b.y - a.y) > tolerance ? b.y - a.y : a.x - b.x);
  const rows: Array<{ y: number; items: PdfTextItem[] }> = [];

  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
      row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row, index) => {
      const items = row.items.sort((a, b) => a.x - b.x);
      return {
        pageNumber: page.pageNumber,
        sourceLine: index + 1,
        y: row.y,
        items,
        text: normalizeVocabularyText(items.map((item) => item.str).join(' ')),
      };
    });
}

function recurringMargins(pages: PdfTextPage[]) {
  const occurrences = new Map<string, Set<number>>();
  for (const page of pages) {
    const rows = clusterTextItems(page);
    for (const row of [...rows.slice(0, 2), ...rows.slice(-2)]) {
      const key = normalizeDuplicateKey(row.text);
      if (!key || /^\d+(\s*\/\s*\d+)?$/.test(key)) continue;
      const pageNumbers = occurrences.get(key) || new Set<number>();
      pageNumbers.add(page.pageNumber);
      occurrences.set(key, pageNumbers);
    }
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  return new Set([...occurrences.entries()].filter(([, pageNumbers]) => pageNumbers.size >= threshold).map(([key]) => key));
}

function splitDelimited(text: string) {
  const delimiter = text.includes('\t')
    ? /\t+/
    : /\s+[—–]\s+/.test(text)
      ? /\s+[—–]\s+/
      : /\s*\|\s*/.test(text)
        ? /\s*\|\s*/
        : /\s*:\s+/.test(text)
          ? /\s*:\s+/
          : /\s{3,}/;
  const parts = text.split(delimiter).map(normalizeVocabularyText).filter(Boolean);
  return parts.length >= 2 ? parts : [];
}

function splitByCoordinates(items: PdfTextItem[]) {
  if (items.length < 2) return [];
  const columns: string[] = [];
  let current = '';
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (index > 0) {
      const previous = items[index - 1];
      const gap = item.x - (previous.x + previous.width);
      if (gap >= 24) {
        columns.push(normalizeVocabularyText(current));
        current = '';
      }
    }
    current += `${current ? ' ' : ''}${item.str}`;
  }
  if (current) columns.push(normalizeVocabularyText(current));
  return columns.filter(Boolean);
}

function looksLikePos(value: string) {
  const key = normalizeDuplicateKey(value).replace(/[()]/g, '');
  return POS_WORDS.has(key) || /^(n|v|adj|adv|prep|pron|conj)\.?$/i.test(key);
}

function fieldsFromParts(parts: string[]) {
  if (parts.length < 2) return null;
  const [front, second, third, ...rest] = parts;
  if (parts.length === 2) return { front, translation: second, pos: '', example: '' };
  if (looksLikePos(second)) return { front, pos: second, translation: third || '', example: rest.join(' — ') };
  if (looksLikePos(third || '')) return { front, translation: second, pos: third, example: rest.join(' — ') };
  return { front, translation: second, pos: third || '', example: rest.join(' — ') };
}

function candidateFromRow(row: VisualRow, sequence: number) {
  const coordinateParts = splitByCoordinates(row.items);
  const delimiterParts = splitDelimited(row.text);
  const parts = coordinateParts.length >= 3 ? coordinateParts : delimiterParts.length ? delimiterParts : coordinateParts;
  const numberedCells = parts.filter((part) => /^\d+[.)]\s*/.test(part)).length;
  if (numberedCells >= 2) return null;
  const parsed = fieldsFromParts(parts);
  if (!parsed) return null;
  parsed.front = parsed.front.replace(/^\d+[.)]\s*/, '');
  const validation = validateCandidateFields(parsed);
  const structureScore = parts.length >= 4 ? 0.96 : parts.length === 3 ? 0.88 : 0.56;
  return {
    id: `pdf-${row.pageNumber}-${row.sourceLine}-${sequence}`,
    ...validation.fields,
    pageNumber: row.pageNumber,
    sourceLine: row.sourceLine,
    confidence: clampConfidence(structureScore - (validation.missing.length * 0.12)),
    status: validation.status,
    selected: validation.status === 'valid',
  } satisfies PdfCardCandidate;
}

export function parseVocabularyPages(pages: PdfTextPage[], maxCandidates: number = PDF_IMPORT_LIMITS.maxCandidates) {
  const repeated = recurringMargins(pages);
  const candidates: PdfCardCandidate[] = [];
  let limited = false;

  for (const page of pages) {
    for (const row of clusterTextItems(page)) {
      const key = normalizeDuplicateKey(row.text);
      if (!key || repeated.has(key) || /^([—–-]?\s*)?\d+(\s*\/\s*\d+)?$/.test(key)) continue;
      const candidate = candidateFromRow(row, candidates.length + 1);
      if (!candidate) continue;
      candidates.push(candidate);
      if (candidates.length >= maxCandidates) {
        limited = true;
        return { candidates, limited };
      }
    }
  }
  return { candidates, limited };
}
