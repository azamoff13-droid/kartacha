# Scheduler notes

Karta.cha hozircha localStorage asosidagi sodda spaced repetition ishlatadi. Maqsad: har kuni qisqa queue berish va yangi kartalar review kartalarni bosib ketmasligi.

## Daily queue

- New cards: maximum 5 per deck per day.
- Review cards: maximum 15 due cards per deck per day.
- Queue order: due review cards first, then new cards.
- Due review cards are sorted by earliest `dueAt`.

## Rating intervals

The session uses four ratings:

- `again`: 1 day. The card is counted as a lapse and comes back tomorrow.
- `hard`: at least 1 day, or the previous interval multiplied by 1.2.
- `good`: at least 2 days, or the previous interval multiplied by 2.5.
- `easy`: at least 4 days, or the previous interval multiplied by 3.5.

Intervals are rounded up to whole days. This keeps the logic predictable while the product is still local-only.

## Session summary

At the end of a daily queue the app shows:

- reviewed cards in the current session;
- XP earned from ratings;
- cards scheduled to return by tomorrow.

XP is intentionally simple: `again` gives 5, `hard` gives 8, `good` gives 10, and `easy` gives 12.
