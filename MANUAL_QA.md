# Manual QA checklist — pre-deployment

Run `npm run build && npm run preview`, then work through this list in a real browser.
Automated coverage lives in `npm test` (unit/component) and `npm run test:e2e` (Playwright);
this list covers what a human still needs to eyeball.

## Navigation
- [ ] Home page loads and shows the grade cards; only Grade 7 is enabled.
- [ ] Home → Grade 7 → Coordinate System works, and the back links go back correctly.
- [ ] Every game card on the Coordinate System page opens its game.
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

## Feedback and sound
- [ ] A wrong answer always shows feedback and never blocks a retry (except Coordinate Detective, which is single-attempt by design).
- [ ] The sound toggle mutes and unmutes, and the preference survives a reload.

## Layout and devices
- [ ] At a phone width (~375px) the grid, inputs and buttons stay usable and nothing overflows horizontally.
- [ ] Buttons are large enough to tap; the coordinate plane is still readable.

## Console
- [ ] No errors or React warnings in the browser console while playing through a game.
