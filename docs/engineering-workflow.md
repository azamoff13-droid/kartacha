# Karta.cha Engineering Workflow

This workflow keeps `main` stable while Karta.cha grows from a local flashcard app into an account-based learning product.

## Product Direction

Karta.cha is for young learners in Uzbekistan who study English and Korean. The product should help them remember vocabulary with measurable practice, not just flip cards.

Core MVP decisions:

- English and Korean are first-class languages.
- Users must have accounts from the first real version.
- Supabase is the preferred auth and database stack.
- The first learning flow is student-first; teacher dashboard comes later.
- Progress is measured by active study time, recall quality, and due words.
- Guided sessions support time goal, word-count goal, and free practice.
- Review ratings are `again`, `hard`, `good`, and `easy`.
- The first scheduler is simple interval-based logic, isolated in code for future replacement.
- First starter content target is 100 English cards and 100 Korean cards.
- Browser TTS is acceptable as a lightweight first audio feature.

## Branch Rules

Never commit directly to `main` for product work.

Use one focused branch per change:

- `feature/supabase-auth`
- `feature/onboarding`
- `feature/guided-session`
- `feature/scheduler`
- `feature/progress-dashboard`
- `feature/tts`
- `docs/engineering-workflow`
- `fix/mobile-session-layout`

Keep each branch small enough to review in one sitting. If a feature needs database, UI, and scheduler changes, split it into safe milestones instead of one risky branch.

## Main Branch Contract

`main` must always:

- install dependencies with `npm install`;
- pass `npm run lint`;
- pass `npm run build`;
- open locally with `npm run dev`;
- preserve existing user flows unless a branch intentionally changes them;
- avoid half-finished auth, migration, or environment-dependent code.

If a feature is incomplete, keep it on its branch or hide it behind a clear guard until it is ready.

## Required Checks Before Merge

Run these before merging or pushing a branch for review:

```bash
npm run lint
npm run build
```

For UI or learning-flow changes, also do manual QA:

- open the app locally;
- register/login when auth exists;
- select English and Korean;
- start a guided session;
- reveal a card;
- rate with each review button;
- finish a session and check summary;
- add a custom card;
- refresh and confirm progress persists;
- check a narrow mobile viewport.

Use [`docs/qa-checklist.md`](qa-checklist.md) for release-style manual QA.

## Commit Rules

Commits should describe the user-facing or system-level change:

- `Add Supabase auth client`
- `Create onboarding goal picker`
- `Track active study time`
- `Add simple review scheduler`
- `Show seven-day progress summary`

Avoid vague commits such as `update`, `changes`, or `fix stuff`.

## Push And Review Flow

For each branch:

1. Create the branch from current `main`.
2. Make the smallest useful change.
3. Run lint and build.
4. Run relevant manual QA.
5. Commit the change.
6. Push the branch to GitHub.
7. Review the diff before merging.
8. Merge only after checks pass.

Prefer pull requests for non-trivial work. A branch can be merged locally only when the diff is small, checks pass, and the change is low-risk.

## Supabase And Secrets

Do not commit secrets.

Expected local environment file:

```bash
.env.local
```

Supabase-related values should use `NEXT_PUBLIC_` only when they are safe for browser exposure. Service-role keys must never be used in client-side code.

Database changes should be planned as migrations:

- create schema changes on a feature branch;
- document tables and policies in the branch;
- verify row-level security rules;
- test with at least one normal user account;
- keep rollback notes for risky migrations.

## Data Model Direction

Plan the database around future teacher reporting, even though teacher dashboard is not in MVP.

Likely tables:

- `profiles`: user settings, selected language, daily goal;
- `cards`: curated and custom vocabulary;
- `review_state`: current user-card interval and due date;
- `review_logs`: every `again/hard/good/easy` answer;
- `study_sessions`: active time, mode, started and finished timestamps;
- `daily_summaries`: cached daily progress for fast dashboard display.

Keep scheduler logic independent from Supabase calls so it can be tested and replaced later.

## Rollback Rules

If a branch breaks build or core learning flow:

- do not merge it;
- revert only the branch work, not unrelated user changes;
- keep `main` unchanged;
- write a short note about what failed and what should be tried next.

If a bad change reaches `main`, make a new rollback branch and revert the specific commit. Do not use destructive commands like `git reset --hard` on shared work.

## Definition Of Done

A change is done only when:

- the branch has a clear purpose;
- code or docs match the current product direction;
- lint and build pass;
- relevant manual QA is complete;
- the GitHub branch is pushed;
- `main` remains stable;
- the next recommended step is clear.
