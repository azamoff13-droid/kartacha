# 100 English Verbs Demo Seed Design

## Goal

Load the supplied list of 100 common English verbs into the browser-only demo profile with Uzbek translations.

## Design

- Add a typed static dataset containing the 100 verbs, Uzbek translations, and `fe'l` as part of speech.
- Activate the seed only when the app opens with `?demo=verbs100`.
- Force demo mode, select the English deck, and open the Cards management view.
- Merge by normalized English front text so re-opening the URL does not create duplicates.
- Persist through the existing demo localStorage store only. Do not write to Supabase or signed-in profiles.
- Keep examples empty because the supplied PDF contains no example sentences.

## Verification

- Confirm the dataset contains exactly 100 unique verbs.
- Run TypeScript, tests, lint, and production build.
- Open the demo URL and confirm 100 translated demo cards are visible in the English deck.
