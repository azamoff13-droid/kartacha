# Karta.cha Manual QA Checklist

Use this checklist before merging user-facing changes. Record each item as `Pass`, `Fail`, or `N/A`, with a short note for failures.

## Setup

- Browser and viewport:
- Branch or commit:
- Tester:
- Date:

## Preflight

- Run `npm install` if dependencies are missing.
- Run `npm run lint`.
- Run `npm run build`.
- Start the app with `npm run dev`.
- Open `http://localhost:3000`.
- Reset local data when a clean run is needed:

```js
localStorage.removeItem('fc-app-v1');
location.reload();
```

## Register

Current baseline note: registration is not implemented yet. Mark these checks `N/A` until auth exists.

- New user can open the registration screen.
- Required fields show clear validation messages.
- Weak or invalid input is rejected without losing typed values.
- Successful registration lands the user in the app.
- A duplicate account attempt shows a clear, non-technical message.

## Login

Current baseline note: login is not implemented yet. Mark these checks `N/A` until auth exists.

- Existing user can open the login screen.
- Empty or invalid credentials show clear validation messages.
- Wrong credentials show a clear, non-technical error.
- Successful login lands the user in the main learning flow.
- Loading state prevents double submit.

## Add Card

- Switch to the target deck.
- Open `Qo'shish`.
- Confirm the save button is disabled until word and translation are filled.
- Add a card with word, translation, word type, and example.
- Confirm the app returns to `Kartalar`.
- Confirm the newly added card appears after the built-in deck cards.
- Reveal the card and confirm translation/example are readable.
- Refresh the page and confirm the custom card persists.
- Switch decks and confirm the custom card stays attached to the original deck.

## Review

- Open `Kartalar`.
- Reveal the current card.
- Mark a card with `Bilaman` and confirm the learned count increases.
- Mark a different card with `Bilmadim` and confirm it does not count as learned.
- Use `Oldingi` and `Keyingisi` to move through cards.
- Switch decks and confirm each deck keeps its own progress.
- Open `Test` and answer one quiz round.
- Confirm correct and wrong answers are visibly distinguished.
- Finish the quiz and confirm the result screen appears.

## Logout

Current baseline note: logout is not implemented yet because auth is not implemented. Mark these checks `N/A` until auth exists.

- User can log out from a predictable place in the UI.
- Logout clears private session state.
- Browser refresh does not restore a logged-out session.
- Logged-out users cannot access private learning data.
- User can log in again after logout.

## Regression Notes

- Desktop layout issue:
- Mobile layout issue:
- Console error:
- Data persistence issue:
- Other:
