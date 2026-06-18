export type PdfCandidateStatus = 'valid' | 'duplicate' | 'incomplete' | 'invalid';

export type PdfCardCandidate = {
  id: string;
  front: string;
  translation: string;
  pos: string;
  example?: string;
  pageNumber: number;
  sourceLine: number;
  confidence: number;
  status: PdfCandidateStatus;
  selected: boolean;
  duplicateAction?: 'skip' | 'update';
};

export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
};

export type PdfTextPage = {
  pageNumber: number;
  items: PdfTextItem[];
};

export type PdfParseRequest = {
  type: 'parse';
  bytes: ArrayBuffer;
  startPage?: number;
  endPage?: number;
};

export type PdfCancelRequest = { type: 'cancel' };

export type PdfWorkerResponse =
  | { type: 'metadata'; totalPages: number }
  | { type: 'progress'; currentPage: number; totalPages: number }
  | { type: 'complete'; candidates: PdfCardCandidate[]; totalPages: number; limited: boolean }
  | { type: 'cancelled' }
  | { type: 'error'; code: string; message: string };

export const PDF_IMPORT_LIMITS = {
  maxBytes: 25 * 1024 * 1024,
  maxPages: 300,
  maxCandidates: 2000,
  maxBatch: 100,
  front: 200,
  translation: 500,
  pos: 60,
  example: 1000,
} as const;
