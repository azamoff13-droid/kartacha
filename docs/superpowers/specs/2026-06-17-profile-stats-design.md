# Karta.cha Profile Stats Design

## Goal

Add personal profile statistics for signed-in users without breaking the current demo/localStorage experience.

Each registered user should have profile data showing:

- Google identity: name, email, avatar
- Learned words
- Total reviews
- Total active study time
- Average recall time
- Streak
- Hard words
- Sync status

## Decisions

- Use a hybrid architecture: keep localStorage for demo/offline fallback, and add Supabase-backed sync for signed-in users.
- Signed-in user data should eventually be server source-of-truth.
- A word counts as learned when its latest review rating is `good` or `easy` and `intervalDays >= 2`.
- Study time counts active interaction time only, with a 60-second inactivity cap.
- Average recall time is measured from when a card becomes visible until the user opens the answer.
- Existing local/demo progress is imported into a signed-in profile only after explicit user confirmation.
- Imported old progress brings cards, reviews, and activity, but not historical time metrics.
- First profile version uses Google identity only; editable profile fields are deferred.

## Architecture

The feature has three layers.

### Local UI State

The current flashcard UI stays fast. When the user rates a card, the UI updates immediately and moves to the next card. Demo mode continues to use localStorage.

### Background Sync Queue

For signed-in users, review and study events are appended to a local pending sync queue. The queue is sent to API routes in the background. If the network or API fails, the event stays pending and retries later.

### Supabase Data

Supabase stores signed-in user progress:

- Cards
- Reviews
- Activity
- Study events

Profile statistics are calculated from this server data, with local fallback while sync is pending.

## API Surface

### `GET /api/sync/bootstrap`

Loads signed-in user decks, cards, reviews, activity, and profile stats into the frontend after login.

### `POST /api/reviews`

Stores one or more review events and updates the latest review state for each card.

Payload should include:

- `clientEventId`
- `cardId`
- `deckKey`
- `rating`
- `shownAt`
- `revealedAt`
- `ratedAt`
- `activeMs`
- `recallMs`

### `POST /api/sync/import`

Imports confirmed local/demo progress into the signed-in user's Supabase profile.

Import rules:

- Do not delete local progress if import fails.
- Skip or update duplicates using the existing `userId + deckId + front` uniqueness rule.
- Do not create historical `StudyEvent` rows for imported local progress.

### `GET /api/profile/stats`

Returns the compact profile panel data:

- identity
- learned word count
- total review count
- total active study time
- average recall time
- streak
- hard words
- pending sync count/status

## Data Model

The existing models remain:

- `User`
- `Deck`
- `Card`
- `Review`
- `Activity`

Add a new `StudyEvent` model:

```prisma
model StudyEvent {
  id         String       @id @default(cuid())
  clientEventId String    @unique
  userId     String
  cardId     String
  deckKey    String
  rating     ReviewRating
  shownAt    DateTime
  revealedAt DateTime?
  ratedAt    DateTime
  activeMs   Int
  recallMs   Int?
  createdAt  DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([userId, cardId])
}
```

`clientEventId` makes background sync idempotent. Retrying the same queued event should not create duplicate study events.

`recallMs` is nullable because a user can rate or leave a card without revealing it.

The existing models need small extensions:

```prisma
model Deck {
  key String

  @@unique([userId, key])
}

model Card {
  pos String?
}
```

`Deck.key` maps client deck keys such as `en` and `ko` to server decks. `Card.pos` preserves the current card UI's part-of-speech label.

## Metric Rules

### Learned Words

Count cards whose latest review is:

- `rating` is `good` or `easy`
- `intervalDays >= 2`

### Total Study Time

Sum `StudyEvent.activeMs`.

Each card interaction should cap active time at 60 seconds so an idle tab does not inflate totals.

### Average Recall Time

Average `StudyEvent.recallMs` where `recallMs` is not null.

`recallMs` is measured as:

```text
revealedAt - shownAt
```

### Hard Words

Cards whose latest review rating is `again` or `hard`.

### Total Reviews

Count review events for the user.

### Streak

Use the existing `Activity.streak` and `Activity.bestStreak` fields.

## UI Flow

### Profile Panel

The profile panel opens from the existing account/streak area.

It shows:

- avatar
- name
- email
- learned words
- total reviews
- total active study time
- average recall time
- streak
- hard words
- sync status

Sync status labels:

- `Saqlangan`
- `Sinxronlanmoqda`
- `Offline queue: N`

### Login And Import

When a user signs in with Google:

1. The app calls `/api/sync/bootstrap`.
2. If local/demo progress exists, show a banner:
   `Bu qurilmada eski progress bor. Profilga ko'chirasizmi?`
3. User can choose:
   - `Ko'chirish`
   - `Hozir emas`
4. `Ko'chirish` calls `/api/sync/import`.
5. `Hozir emas` leaves local demo data untouched and continues with server profile data.

### Review Timing

When a card appears:

- set `shownAt`

When the answer is revealed:

- set `revealedAt`
- compute `recallMs`

When a rating is selected:

- set `ratedAt`
- compute `activeMs` with 60-second cap
- generate stable `clientEventId`
- update local UI immediately
- append event to sync queue
- send event to `/api/reviews` in the background

## Error Handling

- API sync failures keep events in the local pending queue.
- Retried sync events use `clientEventId` to avoid duplicate server rows.
- Import failures do not delete or mutate local progress.
- Duplicate cards during import are skipped or updated, not duplicated.
- Logout preserves unsynced queue data locally.
- Profile panel shows pending sync count when events are waiting.
- If `revealedAt` is missing, do not include that event in average recall time.

## Testing Plan

### Automated/Command Checks

- `npm run prisma:generate`
- `npx prisma validate`
- `npm run lint`
- `npm run build`

### API Checks

Use signed-in manual or scripted checks for:

- `GET /api/sync/bootstrap`
- `POST /api/sync/import`
- `POST /api/reviews`
- `GET /api/profile/stats`

### Manual QA

- Google login still works.
- Demo mode still works without Google login.
- Existing flashcard review UX remains fast.
- Local progress import banner appears only when local progress exists.
- Import does not duplicate cards.
- Reviewing one card updates profile stats.
- Average recall time changes only after answer reveal.
- Offline/API failure leaves pending sync visible.
- Profile panel fits on mobile.
- Production `/api/auth/config` still returns `google:true`, `database:true`, `secret:true`.

## Out Of Scope For First Version

- Editable profile name
- Custom avatar upload
- Bio
- Daily goal editing
- Public profile page
- Leaderboard
- Social sharing
