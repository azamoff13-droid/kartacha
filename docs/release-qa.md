# Release QA notes

Date: 2026-06-16
Branch: `codex/google-auth-30day-release`

## Completed slices

- Google sign-in scaffold with NextAuth and Google provider.
- Per-account localStorage namespace for signed-in users.
- Demo mode fallback when OAuth credentials are not configured.
- Daily queue, scheduler notes, session summary, hard words panel, and clearer progress stats.
- Keyboard hints for `Space`, `1`, `2`, `3`, and `4`.
- Add, edit, delete, search, and filter flows for cards.
- Deck switcher now shows the current daily queue count per deck.
- Contrast, wide layout, mobile layout, Korean/long-word wrapping, and light card transition pass.
- Browser Speech API TTS prototype via the sound button on each flashcard.
- README sections for Git workflow, API routes, tests, env vars, and local data reset.

## Verification

- `npm run lint` passed with existing hook dependency warnings.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Browser QA at 1440px confirmed demo fallback, account chip, progress stats, shortcuts, and flashcard UI.
- Browser QA at 390px confirmed no horizontal overflow.
- Cards panel QA confirmed search input, five filters, card list, and add form render correctly.

## Release notes

Production Google login requires these Vercel environment variables:

- `NEXTAUTH_URL=https://kartacha.vercel.app`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Google Cloud OAuth must include this redirect URI:

```text
https://kartacha.vercel.app/api/auth/callback/google
```
