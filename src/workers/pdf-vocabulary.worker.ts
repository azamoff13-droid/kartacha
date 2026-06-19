/// <reference lib="webworker" />

import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { parseVocabularyPages } from '@/src/lib/pdf-import/vocabulary-parser';
import { PDF_IMPORT_LIMITS, type PdfParseRequest, type PdfTextPage, type PdfWorkerResponse } from '@/src/lib/pdf-import/types';

(globalThis as typeof globalThis & { pdfjsWorker?: { WorkerMessageHandler: typeof WorkerMessageHandler } }).pdfjsWorker = { WorkerMessageHandler };

const workerScope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;
let cancelled = false;
let activeDocument: PDFDocumentProxy | null = null;

function send(message: PdfWorkerResponse) {
  workerScope.postMessage(message);
}

function knownPdfError(error: unknown) {
  const value = error as { name?: string; message?: string; code?: number };
  if (value?.name === 'PasswordException') {
    return { code: 'password', message: "PDF parol bilan himoyalangan. Parolsiz nusxani tanlang." };
  }
  if (value?.name === 'InvalidPDFException' || value?.name === 'MissingPDFException') {
    return { code: 'invalid-pdf', message: "PDF buzilgan yoki ochib bo'lmaydi." };
  }
  return { code: 'worker-failure', message: value?.message || "PDF'ni o'qishda xatolik yuz berdi." };
}

async function parsePdf(request: PdfParseRequest) {
  cancelled = false;
  let bytes: ArrayBuffer | null = request.bytes;
  const pages: PdfTextPage[] = [];

  try {
    const loadingTask = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useWorkerFetch: false });
    activeDocument = await loadingTask.promise;
    const totalPages = activeDocument.numPages;
    send({ type: 'metadata', totalPages });

    if (totalPages > PDF_IMPORT_LIMITS.maxPages) {
      send({ type: 'error', code: 'page-limit', message: `PDF ${PDF_IMPORT_LIMITS.maxPages} sahifadan oshmasligi kerak.` });
      return;
    }

    const startPage = request.startPage ?? 1;
    const endPage = request.endPage ?? totalPages;
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage || endPage > totalPages) {
      send({ type: 'error', code: 'page-range', message: "Sahifa oralig'i PDF chegarasiga mos emas." });
      return;
    }

    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      if (cancelled) {
        send({ type: 'cancelled' });
        return;
      }
      const page = await activeDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = textContent.items.flatMap((item) => {
        if (!('str' in item) || !item.str.trim()) return [];
        return [{
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
        }];
      });
      pages.push({ pageNumber, items });
      page.cleanup();
      send({ type: 'progress', currentPage: pageNumber - startPage + 1, totalPages: endPage - startPage + 1 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (!pages.some((page) => page.items.length)) {
      send({ type: 'error', code: 'no-text', message: "Bu PDF'da tanlanadigan matn topilmadi. OCR hozircha qo'llanmaydi." });
      return;
    }

    const result = parseVocabularyPages(pages);
    if (!result.candidates.length) {
      send({ type: 'error', code: 'unsupported-layout', message: "Lug'at qatorlari topilmadi. Qatorlar “so'z — tarjima — turkum” yoki jadval ustunlari ko'rinishida bo'lishi kerak." });
      return;
    }
    send({ type: 'complete', candidates: result.candidates, totalPages, limited: result.limited });
  } catch (error) {
    if (cancelled) send({ type: 'cancelled' });
    else send({ type: 'error', ...knownPdfError(error) });
  } finally {
    pages.splice(0, pages.length);
    bytes = null;
    if (activeDocument) await activeDocument.destroy().catch(() => undefined);
    activeDocument = null;
  }
}

workerScope.onmessage = (event: MessageEvent<PdfParseRequest | { type: 'cancel' }>) => {
  if (event.data.type === 'cancel') {
    cancelled = true;
    return;
  }
  void parsePdf(event.data);
};

export {};
