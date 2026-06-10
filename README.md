# Karta.cha

Karta.cha is a small Next.js flashcard app for language practice. The current build stores progress and custom cards in the browser with `localStorage`.

## Requirements

- Node.js 18.17 or newer
- npm

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

## Checks

Run lint:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

There is no dedicated automated test suite yet. For now, use lint and build as the baseline checks.

## Engineering Workflow

Keep `main` stable. Use the safe branch, test, review, and merge rules in
[`docs/engineering-workflow.md`](docs/engineering-workflow.md) for every feature.
The recurring 30-day automation prompt is tracked in
[`docs/automation-30-day-plan.md`](docs/automation-30-day-plan.md).

## Manual Baseline QA

1. Open `http://localhost:3000`.
2. Confirm the flashcard app renders without console-breaking errors.
3. Switch between available decks.
4. Reveal a card and mark it as known or unknown.
5. Add a custom card and confirm it appears in the current deck.
6. Refresh the page and confirm saved progress/custom cards persist.

For release-style manual testing, use the fuller QA checklist in
[`docs/qa-checklist.md`](docs/qa-checklist.md).

## Reset Local Data

The app saves data under the `fc-app-v1` localStorage key. To reset local progress in the browser console:

```js
localStorage.removeItem('fc-app-v1');
location.reload();
```
