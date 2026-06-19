'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DECKS } from '@/src/lib/decks';
import { markDuplicateCandidates, refreshCandidate } from '@/src/lib/pdf-import/vocabulary-parser';
import { PDF_IMPORT_LIMITS, type PdfCardCandidate, type PdfWorkerResponse } from '@/src/lib/pdf-import/types';

type Result = { added: number; updated: number; skipped: number; failedBatches: number };
type FailedBatch = Array<Pick<PdfCardCandidate, 'front' | 'translation' | 'pos' | 'example' | 'duplicateAction'>>;

type Props = {
  initialDeckKey: string;
  existingFronts: Record<string, string[]>;
  signedIn: boolean;
  onApplyLocal: (deckKey: string, cards: PdfCardCandidate[]) => { added: number; updated: number; skipped: number };
  onClose: () => void;
  onOpenCards: (deckKey: string) => void;
};

const FILTERS = [
  ['all', 'Hammasi'],
  ['valid', 'Tayyor'],
  ['duplicate', 'Duplicate'],
  ['incomplete', 'To‘ldirish kerak'],
  ['invalid', 'Xato'],
] as const;

function splitBatches<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

export function PdfImportWorkspace({ initialDeckKey, existingFronts, signedIn, onApplyLocal, onClose, onOpenCards }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deckKey, setDeckKey] = useState(initialDeckKey);
  const [file, setFile] = useState<File | null>(null);
  const [allPages, setAllPages] = useState(true);
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [limitNotice, setLimitNotice] = useState('');
  const [candidates, setCandidates] = useState<PdfCardCandidate[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result>({ added: 0, updated: 0, skipped: 0, failedBatches: 0 });
  const [failedBatches, setFailedBatches] = useState<FailedBatch[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const updateCandidate = (id: string, patch: Partial<PdfCardCandidate>) => {
    setCandidates((items) => {
      const updated = items.map((candidate) => {
        if (candidate.id !== id) return candidate;
        const editable = patch.front !== undefined
          ? { ...candidate, status: 'valid' as const, duplicateAction: undefined }
          : candidate;
        const next = refreshCandidate({ ...editable, ...patch });
        if (patch.duplicateAction === 'update' && next.status === 'duplicate') return { ...next, selected: true };
        return next;
      });
      return patch.front !== undefined
        ? markDuplicateCandidates(updated, existingFronts[deckKey] || [], deckKey === 'ko' ? 'ko' : 'en')
        : updated;
    });
  };

  const selected = candidates.filter((candidate) => candidate.selected && (candidate.status === 'valid' || (candidate.status === 'duplicate' && candidate.duplicateAction === 'update')));
  const counts = useMemo(() => Object.fromEntries(['valid', 'duplicate', 'incomplete', 'invalid'].map((status) => [status, candidates.filter((item) => item.status === status).length])), [candidates]);
  const visible = candidates.filter((candidate) => {
    const q = search.trim().toLocaleLowerCase();
    const matchesSearch = !q || [candidate.front, candidate.translation, candidate.pos, candidate.example || ''].some((value) => value.toLocaleLowerCase().includes(q));
    return matchesSearch && (filter === 'all' || candidate.status === filter);
  });

  const chooseFile = (nextFile?: File) => {
    setError('');
    if (!nextFile) return;
    if (nextFile.type !== 'application/pdf' && !nextFile.name.toLocaleLowerCase().endsWith('.pdf')) {
      setError("Faqat PDF fayl tanlang.");
      return;
    }
    if (nextFile.size > PDF_IMPORT_LIMITS.maxBytes) {
      setError("PDF hajmi 25 MB'dan oshmasligi kerak.");
      return;
    }
    setFile(nextFile);
  };

  const cancelParsing = () => {
    workerRef.current?.postMessage({ type: 'cancel' });
    workerRef.current?.terminate();
    workerRef.current = null;
    setParsing(false);
    setProgress({ current: 0, total: 0 });
    setError("Tahlil bekor qilindi. Boshqa fayl tanlashingiz mumkin.");
  };

  const parseFile = async () => {
    if (!file || parsing) return;
    setError('');
    setLimitNotice('');
    setProgress({ current: 0, total: 0 });
    setParsing(true);
    try {
      const bytes = await file.arrayBuffer();
      const worker = new Worker(new URL('../workers/pdf-vocabulary.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
        const message = event.data;
        if (message.type === 'metadata') setProgress((value) => ({ ...value, total: message.totalPages }));
        if (message.type === 'progress') setProgress({ current: message.currentPage, total: message.totalPages });
        if (message.type === 'complete') {
          const marked = markDuplicateCandidates(message.candidates, existingFronts[deckKey] || [], deckKey === 'ko' ? 'ko' : 'en');
          setCandidates(marked);
          setLimitNotice(message.limited ? "Birinchi 2 000 ta nomzod olindi; qolganlari limit sabab to'xtatildi." : '');
          setStep(2);
          setParsing(false);
          worker.terminate();
          workerRef.current = null;
        }
        if (message.type === 'cancelled') {
          setParsing(false);
          worker.terminate();
          workerRef.current = null;
        }
        if (message.type === 'error') {
          setError(message.message);
          setParsing(false);
          worker.terminate();
          workerRef.current = null;
        }
      };
      worker.onerror = () => {
        setError("PDF worker ishga tushmadi. Faylni qayta tanlab ko'ring.");
        setParsing(false);
        worker.terminate();
        workerRef.current = null;
      };
      const range = allPages ? {} : { startPage: Number(startPage), endPage: Number(endPage) };
      worker.postMessage({ type: 'parse', bytes, ...range }, [bytes]);
    } catch {
      setError("PDF faylni brauzerda o'qib bo'lmadi.");
      setParsing(false);
    }
  };

  const sendBatches = async (batches: FailedBatch[]) => {
    const failed: FailedBatch[] = [];
    let serverAdded = 0;
    let serverUpdated = 0;
    let serverSkipped = 0;
    for (const batch of batches) {
      try {
        const response = await fetch('/api/cards/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deckKey, cards: batch }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.message || 'Import failed');
        serverAdded += data.added || 0;
        serverUpdated += data.updated || 0;
        serverSkipped += data.skipped || 0;
      } catch {
        failed.push(batch);
      }
    }
    return { failed, serverAdded, serverUpdated, serverSkipped };
  };

  const importSelected = async () => {
    if (!selected.length || importing) return;
    setImporting(true);
    const local = onApplyLocal(deckKey, selected);
    let failed: FailedBatch[] = [];
    if (signedIn) {
      const payload = selected.map(({ front, translation, pos, example, duplicateAction }) => ({ front, translation, pos, example, duplicateAction: duplicateAction || 'skip' }));
      const server = await sendBatches(splitBatches(payload, PDF_IMPORT_LIMITS.maxBatch));
      failed = server.failed;
    }
    setFailedBatches(failed);
    const skippedDuplicates = candidates.filter((candidate) => candidate.status === 'duplicate' && candidate.duplicateAction !== 'update').length;
    setResult({ ...local, skipped: local.skipped + skippedDuplicates, failedBatches: failed.length });
    setImporting(false);
    setStep(3);
  };

  const retryFailed = async () => {
    if (!failedBatches.length || importing) return;
    setImporting(true);
    const server = await sendBatches(failedBatches);
    setFailedBatches(server.failed);
    setResult((value) => ({ ...value, failedBatches: server.failed.length }));
    setImporting(false);
  };

  return (
    <section className="fc-pdf-workspace">
      <div className="fc-pdf-header">
        <div>
          <span className="fc-pos">PDF&apos;dan import</span>
          <h2 className="serif">Lug&apos;atni kartalarga aylantirish</h2>
        </div>
        <div className="fc-pdf-steps" aria-label="Import qadamlari">
          {['Fayl', 'Tekshirish', 'Natija'].map((label, index) => <span key={label} className={step === index + 1 ? 'active' : ''}>{index + 1}. {label}</span>)}
        </div>
        <button className="fc-btn" onClick={onClose}>Yopish</button>
      </div>

      {step === 1 && (
        <div className="fc-pdf-file-step">
          <div className="fc-pdf-options">
            <label className="fc-field"><span className="fc-label">Koloda</span>
              <select className="fc-input" value={deckKey} disabled={parsing} onChange={(event) => setDeckKey(event.target.value)}>
                {Object.entries(DECKS).map(([key, deck]) => <option key={key} value={key}>{deck.name}</option>)}
              </select>
            </label>
            <label className="fc-check"><input type="checkbox" checked={allPages} disabled={parsing} onChange={(event) => setAllPages(event.target.checked)}/> Barcha sahifalar</label>
            {!allPages && <div className="fc-page-range">
              <label><span>Boshlanish</span><input className="fc-input" type="number" min="1" value={startPage} onChange={(event) => setStartPage(event.target.value)}/></label>
              <label><span>Tugash</span><input className="fc-input" type="number" min="1" value={endPage} onChange={(event) => setEndPage(event.target.value)}/></label>
            </div>}
          </div>
          <label className={`fc-pdf-drop ${file ? 'has-file' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
            <input type="file" accept="application/pdf,.pdf" disabled={parsing} onChange={(event) => chooseFile(event.target.files?.[0])}/>
            <strong>{file ? file.name : "PDF'ni shu yerga tashlang"}</strong>
            <span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "yoki fayl tanlang · maksimum 25 MB / 300 sahifa"}</span>
          </label>
          {parsing && <div className="fc-pdf-progress"><div><span style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 4}%` }}/></div><p>{progress.total ? `${progress.current}/${progress.total} sahifa` : 'PDF ochilmoqda...'}</p></div>}
          {error && <p className="fc-toast error" role="alert">{error}</p>}
          <div className="fc-form-actions">
            {parsing && <button className="fc-btn" onClick={cancelParsing}>Bekor qilish</button>}
            <button className="fc-btn primary" disabled={!file || parsing || (!allPages && (!startPage || !endPage))} onClick={parseFile}>{parsing ? 'Tahlil qilinmoqda...' : 'PDF’ni tahlil qilish'}</button>
          </div>
          <p className="fc-form-note">Fayl va ajratilgan xom matn brauzeringizdan tashqariga yuborilmaydi. Skan PDF uchun OCR hozircha yo&apos;q.</p>
        </div>
      )}

      {step === 2 && (
        <div className="fc-pdf-review">
          {limitNotice && <p className="fc-toast">{limitNotice}</p>}
          <div className="fc-pdf-toolbar">
            <input className="fc-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomzodlardan qidirish"/>
            <div className="fc-filter-tabs">{FILTERS.map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}{value !== 'all' ? ` ${counts[value] || 0}` : ''}</button>)}</div>
            <button className="fc-btn" onClick={() => setCandidates((items) => items.map((item) => item.status === 'valid' ? { ...item, selected: true } : item))}>Tayyorlarini tanlash</button>
          </div>
          <div className="fc-pdf-table-wrap">
            <table className="fc-pdf-table">
              <thead><tr><th/><th>So&apos;z</th><th>Tarjima</th><th>Turkum</th><th>Misol</th><th>Holat</th></tr></thead>
              <tbody>{visible.map((candidate) => <tr key={candidate.id} className={`status-${candidate.status}`}>
                <td><input type="checkbox" checked={candidate.selected} disabled={candidate.status === 'invalid' || candidate.status === 'incomplete' || (candidate.status === 'duplicate' && candidate.duplicateAction !== 'update')} onChange={(event) => updateCandidate(candidate.id, { selected: event.target.checked })}/></td>
                <td><input value={candidate.front} maxLength={PDF_IMPORT_LIMITS.front + 1} onChange={(event) => updateCandidate(candidate.id, { front: event.target.value })}/><small>{candidate.pageNumber}:{candidate.sourceLine}</small></td>
                <td><input value={candidate.translation} maxLength={PDF_IMPORT_LIMITS.translation + 1} onChange={(event) => updateCandidate(candidate.id, { translation: event.target.value })}/></td>
                <td><input value={candidate.pos} maxLength={PDF_IMPORT_LIMITS.pos + 1} onChange={(event) => updateCandidate(candidate.id, { pos: event.target.value })}/></td>
                <td><input value={candidate.example || ''} maxLength={PDF_IMPORT_LIMITS.example + 1} onChange={(event) => updateCandidate(candidate.id, { example: event.target.value })}/></td>
                <td>{candidate.status === 'duplicate' ? <select value={candidate.duplicateAction || 'skip'} onChange={(event) => updateCandidate(candidate.id, { duplicateAction: event.target.value as 'skip' | 'update' })}><option value="skip">O‘tkazib yuborish</option><option value="update">Yangilash</option></select> : <span className="fc-status-chip">{candidate.status === 'valid' ? 'Tayyor' : candidate.status === 'incomplete' ? 'To‘ldiring' : 'Xato'}</span>}<small>{Math.round(candidate.confidence * 100)}%</small></td>
              </tr>)}</tbody>
            </table>
            {!visible.length && <div className="fc-soft-message">Bu filterda nomzod topilmadi.</div>}
          </div>
          <div className="fc-pdf-summary"><span><strong>{selected.length}</strong> ta karta tanlangan</span><span>{counts.duplicate || 0} duplicate · {counts.incomplete || 0} to&apos;liq emas</span><button className="fc-btn" onClick={() => setStep(1)}>Orqaga</button><button className="fc-btn primary" disabled={!selected.length || importing} onClick={importSelected}>{importing ? 'Import qilinmoqda...' : `${selected.length} kartani import qilish`}</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="fc-pdf-result">
          <span className="fc-pos">Import yakunlandi</span>
          <h3 className="serif">Kartalar tayyor</h3>
          <div className="fc-summary-grid"><div><strong>{result.added}</strong><span>qo&apos;shildi</span></div><div><strong>{result.updated}</strong><span>yangilandi</span></div><div><strong>{result.skipped}</strong><span>o&apos;tkazildi</span></div><div><strong>{result.failedBatches}</strong><span>xato batch</span></div></div>
          {!!failedBatches.length && <p className="fc-toast error">Internet yoki server xatosi sabab {failedBatches.length} batch profilingizga yuborilmadi. Kartalar shu qurilmada saqlangan.</p>}
          <div className="fc-form-actions">{!!failedBatches.length && <button className="fc-btn" disabled={importing} onClick={retryFailed}>{importing ? 'Qayta yuborilmoqda...' : 'Xato batchlarni qayta yuborish'}</button>}<button className="fc-btn primary" onClick={() => onOpenCards(deckKey)}>Import qilingan kartalarni ochish</button></div>
        </div>
      )}
    </section>
  );
}
