# Karta.cha

Karta.cha is a small Next.js flashcard app for language practice. The current build stores progress and custom cards in the browser with `localStorage`.

Google sign-in is powered by NextAuth. User data is still stored locally in the browser, but each signed-in Google account gets a separate local storage namespace.

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

## Google Login Setup

Create `.env.local` for local auth testing:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-random-secret
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
```

Google OAuth redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://kartacha.vercel.app/api/auth/callback/google
```

In Vercel, add the same environment variables with `NEXTAUTH_URL=https://kartacha.vercel.app`, then redeploy production.

If Google credentials are missing, the app shows a demo mode so UI work can still be tested.

## API Routes

- `GET/POST /api/auth/[...nextauth]` - NextAuth Google OAuth handlers.
- `GET /api/auth/config` - returns whether Google auth is configured for the current deployment.

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

## Backup and Progress

The account menu includes JSON export/import controls. Export creates a local backup with custom cards, review state, selected deck, and streak data. Import replaces the current browser data for the active account, so export before resetting local storage or switching devices.

## Safe Git Workflow

Use a branch for every change:

```bash
git switch -c codex/short-change-name
git status --short
npm run lint
npm run build
git add <changed-files>
git commit -m "Short change summary"
git push -u origin codex/short-change-name
```

Merge to `main` only after the branch passes checks and the Vercel preview looks correct. Pushing `main` triggers the production deploy.

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

The app saves data under `fc-app-v1:<account>` localStorage keys. Demo mode may also read the legacy `fc-app-v1` key. To reset local progress in the browser console:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith('fc-app-v1'))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```
