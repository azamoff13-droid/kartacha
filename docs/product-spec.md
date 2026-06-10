# Karta.cha Product Spec

This spec captures the current product decisions from the grill-me discussion.

## Audience

Karta.cha is for young learners in Uzbekistan who study English and Korean. The first version should serve students directly; teacher reporting can come later after the student learning loop is reliable.

## Core Problem

Learners spend time memorizing words but often cannot see:

- how much real study time they spent;
- which words they actually remember;
- which words were hard;
- when words should return for review.

The app should move learners away from blind repetition and toward measurable recall practice.

## Product Promise

Karta.cha helps English and Korean learners remember vocabulary by tracking active practice time, recall quality, and due words.

## MVP Scope

- Account-first experience.
- Supabase is the preferred auth and database stack.
- Minimal onboarding: language plus daily goal.
- Daily goal modes: 10 minutes, 20 words, or free practice.
- Active timer that measures real study activity, not idle app-open time.
- Guided study session:
  - choose language and goal;
  - see today's queue;
  - recall first;
  - reveal answer;
  - rate with `again`, `hard`, `good`, or `easy`;
  - finish with session summary.
- Progress:
  - today's active minutes;
  - reviewed words;
  - `good/easy`;
  - `again/hard`;
  - words due tomorrow;
  - simple 7-day history.
- Starter content:
  - 100 English starter cards;
  - 100 Korean starter cards.
- Custom cards.
- Lightweight browser TTS using `speechSynthesis` if it stays simple.

## Non-Goals For MVP

- Teacher dashboard.
- Monetization or course sales CTA.
- Advanced FSRS/Anki-level scheduler.
- Uploaded audio files or AI-generated voice.
- Complex monthly analytics.

## First UI Slice

The current app remains localStorage-based while the first product-direction slice lands. The visible dashboard should start moving toward the guided session model:

- primary action: `Mashqni boshlash`;
- goal picker: 10 minutes, 20 words, free;
- visible signals for queue size and due words;
- copy that explains active recall instead of card flipping.

This slice should not pretend Supabase, auth, or the real scheduler exists yet. It should make the direction visible while keeping `main` stable.
