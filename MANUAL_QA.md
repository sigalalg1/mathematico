# Manual QA checklist — pre-deployment

Run `npm run build && npm run preview`, then work through this list in a real browser.
Automated coverage lives in `npm test` (unit/component) and `npm run test:e2e` (Playwright);
this list covers what a human still needs to eyeball.

## Navigation
- [ ] Home page loads and shows the grade cards; only Grade 7 is enabled.
- [ ] Home → Grade 7 → Coordinate System works, and the back links go back correctly.
- [ ] Home → Grade 7 → Signed Numbers works, and the back links go back correctly.
- [ ] Every game card on the Coordinate System and Signed Numbers pages opens its game.
- [ ] Refresh the page while on a nested URL (e.g. `/grade/7/coordinate-system/hit-the-target`) — it must load, not 404. (This is what the Netlify SPA redirect fixes.)

## Language and direction
- [ ] Default language is Hebrew and the page reads right-to-left.
- [ ] The language switch flips to English and the page reads left-to-right.
- [ ] The choice survives a reload.
- [ ] Coordinate pairs, numbers and the coordinate plane stay left-to-right in Hebrew (X is on the left, Y on the right — never reversed).
- [ ] No raw keys like `hitTheTarget.prompt` appear anywhere, in either language.

## Exercise variety
- [ ] Replay a game (Play Again) a few times — the numbers and points change each round.
- [ ] Consecutive targets are not identical or nearly on top of each other.

## Per-game spot checks
- [ ] **Meet the Axes / Coordinate Vocabulary** — questions progress, explanations appear on a wrong answer, completion screen shows a score.
- [ ] **Hit the Target** — a correct pair hits; a wrong one gives a specific hint (swapped / X sign / Y sign) and lets you try again without getting stuck.
- [ ] **Launch the Spaceship** — left/right then up/down move the ship; a repeated wrong direction shows a hint; the final stage lets you click the destination directly.
- [ ] **Quadrant Challenge** — clicking a quadrant works; the sign stage accepts only the matching pair; axis and origin points are never accepted as a quadrant.
- [ ] **Coordinate Detective** — one attempt per case, then a Next button (this game is deliberately not retry-in-place).
- [ ] **Distances and Segments** — positive, negative, and crossing-zero segments all give the correct length.
- [ ] **Shapes on the Plane** — missing vertex D works for a rectangle, a square, and an isosceles trapezoid; a wrong point does not complete the shape; perimeter and area answers are checked.
- [ ] **Isosceles trapezoid** — the stated condition ("AB and CD are parallel") makes exactly one D sensible; there is no second point a student could defend.
- [ ] **Find the Point** — four labelled points show at once; a wrong click explains the mistake and the points stay clickable.
- [ ] **Draw by Coordinates** — each correct click adds a point and connects the line; a wrong click hints at X or Y; the last point reveals the finished picture.
- [ ] **Coordinate Mission** — the mixed capstone runs through all its question types and the completion screen suggests something to practise.

## Per-game spot checks — Signed Numbers (Grade 7)
- [ ] **Find the Spot** — the line gets longer and less labelled as you go; clicking the mirror image of the target explains the side of zero, and a near miss asks you to recount.
- [ ] **Which Is Greater?** — every question is a trap for "compare the digits" (e.g. -7 vs -3); a wrong pick measures both distances from zero on the line.
- [ ] **Distance from Zero** — `|x|`, "which negative number is d from 0", and the gap between two plotted points A and B all work; a negative answer is called out as impossible.
- [ ] **Steps on the Line** — the walker slides to the answer; a wrong landing draws the move you actually made, and subtracting a negative is explained as turning around.
- [ ] **The Sign Rule** — the first three questions show a descending pattern; the four rule chips light up only for cases you have answered correctly, and the pattern reappears as a hint after a slip.
- [ ] Every signed number, absolute value bar and expression reads left-to-right in Hebrew (e.g. `-3 + 5`, `|-7|`, `(-4) × 3` — never reversed).

## Feedback and sound
- [ ] A wrong answer always shows feedback and never blocks a retry (except Coordinate Detective, which is single-attempt by design).
- [ ] The sound toggle mutes and unmutes, and the preference survives a reload.

## Layout and devices
- [ ] At a phone width (~375px) the grid, inputs and buttons stay usable and nothing overflows horizontally.
- [ ] Buttons are large enough to tap; the coordinate plane is still readable.

## Accounts (student-only)
Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` the app runs guest-only by design:
- [ ] `/account` shows the "accounts unavailable" notice, the form is disabled, and every game still plays.
- [ ] Activity from a guest round appears on `/activity` and survives a reload (localStorage).

With Supabase configured (needs a real project):
- [ ] Sign up with a simple password such as `0000`. If Supabase rejects it, lower
      **Authentication → Sign In / Providers → Minimum password length** in the Supabase dashboard (default 6).
- [ ] If email confirmation is on, the page says to confirm by email; after confirming, sign-in works.
- [ ] Sign in, play a round, and see it on `/activity`; the same round is visible after a reload (session persists).
- [ ] Sign out returns to the sign-in form, and games still play as a guest afterwards.
- [ ] Wrong password shows the server's message, not a blank screen.
- [ ] Go offline (devtools) and try to sign in — a friendly error appears and gameplay keeps working.

## Training mode — Times Tables (`/grade/4/multiplication/multiplication-tables`)
- [ ] Practice: each of 5 / 10 / 20 / 50 runs to the end; a wrong answer moves straight to the next question
      (no "disqualified", no repeat) and the round still finishes.
- [ ] Practice results show correct/total and the longest streak, and no pace figure.
- [ ] Personal challenge only offers 20 and 50 questions; the streak chip rises and drops back to 0 after a mistake.
- [ ] First challenge for a configuration says the result is saved as a baseline, without calling it a record.
- [ ] "Another challenge, same settings" restarts immediately with no re-selection.
- [ ] A faster flawless retry reports a new speed record; a faster run **with mistakes** does not, and explains why.
- [ ] Changing difficulty or question count starts a separate record (the baseline message appears again).
- [ ] Guest records survive a reload; signing in keeps records with the account (needs `training_sessions`, see
      `supabase/migrations/0001_training_sessions.sql`).

## Console
- [ ] No errors or React warnings in the browser console while playing through a game.
