# Karta.cha PDF Vocabulary Import Design

## Goal

Allow users to extract vocabulary cards from text-based dictionary PDFs, review and edit the detected entries, then import selected cards into Karta.cha.

The first version must preserve user privacy by parsing the PDF entirely in the browser. It must not upload the original PDF or extracted raw text to the server.

## Scope Decisions

- Support text-based PDFs with selectable text.
- Reject scanned/image PDFs with a clear OCR-not-supported message.
- User selects the target deck before parsing: Korean or English.
- Support delimiter-separated vocabulary lines and two-column table layouts.
- Require word, translation, and part of speech.
- Keep example sentence optional.
- Show an editable preview before import.
- Mark duplicate cards and skip them by default; allow explicit updates.
- Show incomplete rows and keep them unselected until required fields are filled.
- Parse all pages by default, with an optional inclusive page range.
- Limit each import to 25 MB, 300 pages, and 2,000 candidates.
- Parse in a Web Worker so the UI remains responsive.

## Architecture

### `PdfImportPanel`

Owns the first step of the workflow:

- target deck selection
- file picker and drag-and-drop
- page range selection
- file/page limit validation
- parse progress
- cancellation

It starts the worker but does not contain parsing rules.

### `pdf-vocabulary.worker`

Uses `pdfjs-dist` to read text items and their coordinates page by page.

Responsibilities:

- validate page count
- honor the selected page range
- emit progress after each page
- support cancellation
- pass normalized page text items to the parser
- stop after 2,000 candidates

The worker receives PDF bytes through an `ArrayBuffer`. The bytes remain in browser memory and are released after parsing or cancellation.

### `vocabulary-parser`

A pure TypeScript module with no React, browser, PDF.js, or database dependency.

Responsibilities:

- cluster text items into visual rows using `y` coordinates
- identify columns using significant `x` gaps
- parse `—`, `:`, tab, and column-separated entries
- remove repeated headers, footers, and page numbers
- normalize whitespace and Unicode
- map fields into card candidates
- validate required fields
- calculate status and confidence

Keeping this module pure makes it testable with small coordinate fixtures without opening real PDFs for every test.

### `PdfImportPreview`

Owns the review step:

- search
- status filters
- row selection
- inline editing
- duplicate update choice
- import summary

Desktop uses a table. Mobile uses stacked compact rows. Both surfaces expose the same fields and validation state.

### Bulk Import

Demo users add selected cards to the existing localStorage custom-card collection.

Signed-in users update the local UI immediately, then send batches of up to 100 cards to `POST /api/cards/import`. The server upserts within the authenticated user's selected deck.

The original PDF and raw extracted page text are never sent to this endpoint.

## Candidate Data Model

```ts
type PdfCardCandidate = {
  id: string;
  front: string;
  translation: string;
  pos: string;
  example?: string;
  pageNumber: number;
  sourceLine: number;
  confidence: number;
  status: 'valid' | 'duplicate' | 'incomplete' | 'invalid';
  selected: boolean;
  duplicateAction?: 'skip' | 'update';
};
```

Rules:

- `front`, `translation`, and `pos` are required.
- `example` is optional.
- `front` is limited to 200 characters.
- `translation` is limited to 500 characters.
- `pos` is limited to 60 characters.
- `example` is limited to 1,000 characters.
- `confidence` is a number from 0 to 1 and is informational only; it never bypasses validation or user selection.
- `valid` candidates are selected by default.
- `duplicate`, `incomplete`, and `invalid` candidates are unselected by default.
- An incomplete candidate becomes valid after all required fields are filled.
- A duplicate can be selected only after its action is explicitly changed to `update`.

## Parsing Flow

1. User selects Korean or English deck.
2. User chooses a PDF and optional page range.
3. Client rejects files over 25 MB before worker startup.
4. Worker opens the PDF and rejects files over 300 pages.
5. Worker extracts text items page by page and emits progress.
6. Parser groups text items into rows using coordinate tolerance.
7. Repeated page headers, footers, and page numbers are removed.
8. Rows are interpreted as delimiter lines or table columns.
9. Required fields, confidence, page number, and status are assigned.
10. Candidates are compared with existing cards using normalized `front` text.
11. Preview opens with valid candidates selected.
12. User edits and selects candidates.
13. Import writes to local state immediately.
14. Signed-in imports are sent to the API in 100-card batches.

## Normalization And Duplicate Matching

Duplicate comparison uses:

- trimmed text
- collapsed internal whitespace
- Unicode normalization using NFC
- locale-aware lowercase where applicable

The selected deck is part of the duplicate key. A Korean and English card with the same visible text are not considered duplicates across decks.

Server matching continues to use the existing user/deck/front uniqueness boundary.

## API Design

### `POST /api/cards/import`

Authentication is required.

Request:

```json
{
  "deckKey": "ko",
  "cards": [
    {
      "front": "사랑",
      "translation": "sevgi",
      "pos": "ot",
      "example": "사랑은 중요하다.",
      "duplicateAction": "skip"
    }
  ]
}
```

Rules:

- maximum 100 cards per request
- validate required fields and the same 200/500/60/1,000 character limits used by the preview
- reject unknown deck keys
- derive `userId` from the server session
- never accept a client-provided `userId`
- upsert only when `duplicateAction` is `update`
- otherwise skip existing cards

Response:

```json
{
  "ok": true,
  "added": 83,
  "updated": 4,
  "skipped": 13,
  "errors": []
}
```

## UI Workflow

PDF import opens from the existing Cards mode using a `PDF'dan import` command.

It is a full-width three-step workspace rather than a modal.

### Step 1: File

- deck selector
- drop zone and file picker
- all pages or start/end page range
- parse button

### Step 2: Review

- current page and total-page progress
- cancel command
- search
- filters: All, Ready, Duplicate, Needs input, Error
- desktop table or mobile compact rows
- inline front, translation, part-of-speech, and example editing
- select all ready candidates
- sticky summary with counts

### Step 3: Result

- added count
- updated count
- skipped count
- failed batch count
- retry failed batches
- open imported cards

## Error Handling

### Scanned PDF

If no selectable text is found:

`Bu PDF'da tanlanadigan matn topilmadi. OCR hozircha qo'llanmaydi.`

### Password-Protected Or Corrupt PDF

Stop parsing and show a specific open/decryption error. Do not show a generic import failure when PDF.js provides a known reason.

### Limits

- reject files over 25 MB before parsing
- reject documents over 300 pages
- validate page range against actual page count
- stop candidate generation at 2,000 and show a limit notice

### Unsupported Layout

If no candidates are found, show accepted format examples instead of importing empty data.

### Worker Failure Or Cancellation

Keep the main UI usable. Clear temporary bytes and extracted text. Allow a fresh retry.

### Partial Server Failure

Successful batches remain saved. Failed batches stay in a retry queue with their card data. Retrying must not duplicate already successful cards.

## Performance And Privacy

- Parse off the main thread.
- Transfer PDF bytes to the worker instead of cloning them.
- Emit progress after each page.
- Allow cancellation during extraction and parsing.
- Release PDF bytes and raw text after completion, cancellation, or error.
- Do not persist PDF bytes or raw page text in localStorage, IndexedDB, Supabase, or logs.
- Persist only user-approved card fields after import.

## Testing Strategy

Add Vitest for pure parser and import validation tests.

### Parser Tests

- em dash, colon, tab, and large-space delimiters
- two-column coordinate layout
- mixed Korean, English, and Uzbek Unicode
- repeated header/footer removal
- page-number removal
- whitespace and NFC normalization
- required-field validation
- status transitions after edits
- duplicate normalization
- 2,000 candidate limit
- page range
- cancellation signal

### Fixtures

- simple line dictionary PDF
- two-column dictionary PDF
- dictionary with part of speech and examples
- incomplete and invalid rows
- textless scanned PDF

### API Tests

- authentication required
- unknown deck rejected
- 100-card request limit
- required-field validation
- duplicate skip
- explicit duplicate update
- user isolation
- partial batch retry idempotency

### Manual QA

- file picker and drag-and-drop
- desktop and 390px mobile preview
- 25 MB and 300-page limits
- page range
- progress and cancel
- inline edit
- duplicate update
- demo local import
- signed-in Supabase import
- partial API failure and retry
- imported cards immediately visible in Cards mode
- existing JSON backup import still works
- manual card creation still works

## Success Criteria

- Supported fixtures place at least 95% of entries into the correct fields.
- No duplicate or incomplete candidate imports without explicit user action.
- The PDF and raw extracted text never leave the browser.
- The UI remains responsive and parsing can be cancelled.
- Imported cards appear immediately in the selected deck.
- Existing JSON backup import and manual card creation remain functional.
- Prisma validation, TypeScript, lint, tests, and production build pass.

## Out Of Scope

- OCR for scanned PDFs
- AI-based extraction
- arbitrary prose-to-vocabulary conversion
- more than 300 pages per import
- more than 2,000 candidates per import
- server-side PDF storage
- background import after closing the page
