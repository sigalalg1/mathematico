# Pedagogical QA — Grade 4 Decimal Place Value (Exam Prep)

Reviewed before the final commit on `feature/grade4-decimal-exam-prep`, per the
unit's own build spec. Covers: question types and a real Basic/Intermediate/
Advanced example per skill (pulled directly from the generators, not invented),
what each type assesses, whether Advanced is genuinely harder than Basic (not
just bigger numbers), gaps identified, and a dedicated inspection of a
representative mock exam against the spec's listed failure modes.

No deliberately-planted-and-then-demoed bugs here — every example below is a
real generator output, and every finding under "Gaps" either was fixed before
commit (see the file's own `git log`) or is called out as a known, deliberate
limitation.

## Skill 1 — Place Value and Conversions (`decimalPlaceValue`)

Three templates: `digitValue` (multiple choice — "what value does the digit
in the ___ place represent?"), `countUnit` (numeric — "how many hundreds/
thousands/... are in N?"), `composeUnit` (numeric — "N × unit = ?", the
reverse direction).

- Basic: *"9,406 — what value does the digit in the hundreds place
  represent?"* → 400 (multiple choice).
- Intermediate: *"89,100 — how many hundreds are in this number?"* → 891
  (numeric — note this is the non-exact-multiple case: 891 hundreds with a
  remainder of 0 here, but the template also produces remainders, e.g. a
  number that isn't a clean multiple of the unit, forcing division-with-
  reasoning rather than reading off a digit).
- Advanced: *"721,273 — how many ten-thousands are in this number?"* → 72
  (numeric, six-digit range, non-exact count).

**What it assesses:** reading a digit's positional value (not just the digit
itself) in both directions — decomposing a number into units, and composing
units back into a number.

**Advanced genuinely harder:** yes — basic stays under 10,000 with simple
exact units; advanced reaches into the hundred-thousands and uses `countUnit`
with non-exact multiples, which requires real division-style reasoning
("721,273 has 72 complete ten-thousands, with a remainder"), not just digit
lookup.

**Gaps identified:** `digitValue`'s multiple-choice distractors
(`numericMultipleChoice`) are generic numeric neighbors of the correct value,
not targeted at the two real place-value misconceptions a 4th grader makes —
confusing *the digit* with *the digit's value* (e.g. answering "4" instead of
"400"), or confusing *adjacent places* (answering "40" or "4,000" instead of
"400"). The current distractors are mathematically plausible but don't
specifically surface those two errors. This is a cross-cutting pattern (see
"Unit-wide gaps" below), not unique to this skill. Not fixed in this pass —
documented as a follow-up.

## Skill 2 — Number Construction and Decomposition (`decimalDecomposition`)

Four templates: `expandedSum` (numeric — add the expanded form), `missingTerm`
(numeric — fill in one term of an expansion), `nonstandardCompose` (numeric —
e.g. "42 × 1,000 + 4 × 100", a nonstandard count of a unit plus a smaller
unit), `recognizeDecomposition` (multiple choice, advanced only).

- Basic: *"5,000 + 900 + 20 + 5 = ?"* → 5925.
- Intermediate: *"36,008 = 30,000 + ___ + 8"* → 6,000.
- Advanced: *"506,819 — which is its correct expanded form?"* with options
  `500,000 + 6,000 + 1,700 + 10 + 9` / `600,000 + 6,000 + 800 + 10 + 9` /
  `500,000 + 6,000 + 800 + 10 + 9` (correct) / `500,000 + 6,000 + 800 + 10 + 8`.

**What it assesses:** building a number from its place-value parts and
pulling it back apart, including *nonstandard* decompositions (23 hundreds
rather than "2 thousands 3 hundreds") — the spec's explicit "do not reduce to
standard decomposition only" requirement.

**Advanced genuinely harder:** yes, and well-targeted — the
`recognizeDecomposition` distractors above are not random: one has a
too-large term that would require carrying (1,700 instead of 800 — tests
whether the student actually checks the decomposition sums to 506,819, not
just "looks plausible"), one shifts the leading digit (600,000), one is off
by one in the ones place. All three are genuine misconceptions, not filler.

**Gaps identified:** none found — this skill's distractor design is the
template the other multiple-choice skills should arguably follow (see
"Unit-wide gaps").

## Skill 3 — Ordering, Comparing and Number Sequences (`decimalOrdering`)

Four templates: `compare` (compareSymbol, with a `compareCloseness: 'close'`
mode specifically generating same-leading-digit traps like 70,090 vs 70,900),
`sequenceNext` (numeric), `numberBetween` (numeric, multi-valid, advanced
only, strict open interval), `orderFour` (multiple choice among four
orderings of the same four numbers).

- Basic: compare `9,426` vs `12,433` → `<` (different digit counts — an easy
  case, appropriate for basic).
- Intermediate: *"62,191, 84,588, 86,362, 35,350 — which option orders them
  smallest to largest?"* → `35,350, 62,191, 84,588, 86,362`.
- Advanced: `413,396 < n < 413,419` → any integer in the open interval (e.g.
  413,397); `hasMultipleValidAnswers: true`.

**What it assesses:** place-value-based comparison (not digit-counting
shortcuts), sequence extrapolation, and — at advanced — finding a number
inside a narrow numeric constraint, which only has a real answer because the
generator picks a genuine integer inside the interval first (see Skill 7).

**Advanced genuinely harder:** yes. Advanced's `compare` instances are
deliberately same-leading-digit pairs (`compareCloseness: 'close'`), which is
the one case where "compare the first digit" fails and the student must
actually scan to find the first differing place — basic uses `'far'`
closeness, which is a fundamentally easier read.

**Gaps identified:** none found in this pass.

## Skill 4 — Rounding and Estimation (`decimalRounding`)

Four templates: `roundTo` (multiple choice, 4 options), `nearestBenchmark`
(multiple choice, exactly 2 options — the two real benchmarks), `estimateSum`
(numeric — round both addends, then add), `rangeJudgment` (multiple choice,
2 symbolic options, advanced only).

- Basic: *"383 — round to the nearest hundred"* → 400.
- Intermediate: *"58,351 — which hundred is this number closer to?"* →
  58,300 / 58,400 (correct: 58,400).
- Advanced: *"650,153 + 413,406 — estimate by rounding each to the nearest
  ten-thousand, then add"* → 650,000 + 410,000 = 1,060,000.

**What it assesses:** correct midpoint handling (verified separately in
`placeValue.test.ts`'s `roundTo`/`isRoundingMidpoint` tests, using exact
integer arithmetic — no floating-point risk), reading a rounding benchmark
without necessarily computing the full round, and rounding as a step inside a
larger estimate (not an isolated skill).

**Advanced genuinely harder:** yes — advanced is the only tier that chains
rounding into a second operation (`estimateSum`) and the only tier with
`rangeJudgment` ("is the true sum above or below X without computing it
exactly" — genuine estimation reasoning, not calculation).

**Gaps identified:** `roundTo`'s multiple-choice distractors share the same
generic-numeric-neighbor pattern as Skill 1 (see "Unit-wide gaps") — e.g. for
"383 round to nearest hundred" (→ 400), the classic wrong-direction answer
(300) is not guaranteed to appear in the option set; the shown distractors
(312, 495, 304) are numerically close but don't specifically test "rounded
the wrong way."

## Skill 5 — Addition, Subtraction and Regrouping (`decimalArithmetic`)

Templates: `roundAddSubtract`, `multiDigitAdd`/`multiDigitSubtract` (loop-
guaranteed to require carrying/borrowing — see `requiresCarrying`/
`requiresBorrowing` in the file), `zeroSubtract` (deliberately crosses
zeros), `missingAddend`.

- Basic: *"4,057 + 80"* → 4,137 (carries: 57+80 carries into the hundreds).
- Intermediate: *"51,340 − 45,822"* → 5,518 (multi-place borrowing).
- Advanced: *"700,000 − 699,872"* → 128 (`zeroSubtract` — borrowing across
  five consecutive zeros, the single hardest regrouping case in the whole
  unit) and *"___ + 350,927 = 520,055"* → 169,128 (`missingAddend`, i.e.
  subtraction framed as an unknown-addend problem).

**What it assesses:** genuine regrouping (not just "bigger numbers that
happen not to need it" — the generator actively loops until carrying/
borrowing is required), and the "zeros crossing" case 4th graders find hardest
(700,000 − 699,872).

**Advanced genuinely harder:** yes, clearly — `zeroSubtract` is a distinct,
harder regrouping case gated to advanced only, and `missingAddend` adds an
inverse-operation reasoning step basic/intermediate don't have.

**Gaps identified:** none found. This is the one skill with
`supportsChallenge: true` (fluency drilling is the appropriate place for a
timed personal-best, unlike the other seven skills) — correctly scoped per
the spec's "50 questions only where genuinely appropriate for fluency."

## Skill 6 — Reasoning Without Full Calculation (`decimalParity`)

Four templates: `parity` (evenOddChoice — judge odd/even without computing
the exact sum/difference), `compareExpressions` (compareSymbol between two
*unevaluated* expressions sharing a base), `constructEven` (constructChoice —
build a pair that sums to an even result), `constructThreshold`
(constructChoice — build a difference under a stated threshold).

- Basic: *"4,254 + 7,203 — even or odd, without calculating?"* → odd.
- Intermediate: *"86,535 + 3 vs 86,535 + 2 — which is bigger, without
  computing both?"* → `>` (compare just the added amounts).
- Advanced: *"Tap two numbers and an operation to make an even result"* with
  palette `[2199, 2467, 6514, 3494, 7212]` → e.g. `6514+3494` (both even).

**What it assesses:** this is the skill the spec calls out as mandatory, not
optional — parity reasoning from last digits only, and (advanced) actively
*constructing* a combination that satisfies a condition rather than picking
from a list of pre-computed answers. `validate` checks the mathematical
property directly (`isEven(parsed.result)`), so any valid pair from the
palette is accepted, not just one memorized combination.

**Advanced genuinely harder:** yes — basic only judges a given expression's
parity; advanced requires *generating* a combination from a palette while
avoiding two decoys per attempt (one wrong operand, or the wrong parity
pairing), a meaningfully different cognitive task.

**Gaps identified:** none found.

## Skill 7 — Missing Numbers, Constraints and Multiple Solutions (`decimalConstraints`)

Three templates: `missingDigit` (numeric — one digit of an addend is masked),
`rangeAndDigit` (numeric, multi-valid — find a number in an open interval
with a stated hundreds digit), `targetSum` (constructChoice, multi-valid —
build a pair that sums to exactly a stated target).

- Basic: *"3,02_ + 5,002 = 8,027 — what's the missing digit?"* → 5.
- Intermediate: *"14,094 < n < 14,929, hundreds digit 8 — find a number that
  fits"* → e.g. 14,847 (any number satisfying both conditions is accepted).
- Advanced: *"Tap two numbers and add to make exactly 100,315"* with palette
  `[87936, 28035, 20388, 23518, 79927]` → `20388+79927`.

**What it assesses:** this is explicitly the skill most at risk of an
"impossible question" bug, and it had one — see the fix below. Correctly
built, it assesses working backward from a constraint and recognizing that
more than one answer can be valid.

**Advanced genuinely harder:** yes — basic finds one digit from a single
addition; advanced's `targetSum` requires evaluating multiple candidate pairs
against a palette with distractors designed to tempt a close-but-wrong sum.

**Gaps identified and fixed before commit:** `rangeAndDigit` originally
picked its required hundreds digit *independently* of the generated interval.
A narrow interval (advanced width 100–300) can only ever contain one or two
distinct hundreds digits, so a random, independent digit choice could
describe a range with **no valid answer at all** — the exact "impossible
question" failure mode this QA pass is supposed to catch. Caught while
writing this unit's own test suite (a generator-level search for a concrete
example hung indefinitely, since none existed to find). Fixed by picking a
real number inside the interval *first*, then reading its hundreds digit off
that number — solvability by construction, the same principle `targetSum`
already used correctly. Covered by
`decimalConstraintsData.test.ts`'s "validate requires both the range AND the
hundreds-digit condition" test, which iterates every integer in a sampled
interval, not just one hand-picked case.

## Skill 8 — Word Problems and Integrated Reasoning (`decimalWordProblems`)

Eight narrative templates spanning seven of the other skills' underlying
operations in context: `sumScenario`, `differenceScenario`, `compareScenario`
(compareSymbol), `roundEstimateScenario`, `missingAddendScenario`,
`multiStepScenario` (advanced-only, two chained operations), `digitValueScenario`
(advanced-only, place value inside a real quantity).

- Basic: *"A warehouse had 8,076 boxes. 5,851 boxes were sold. How many boxes
  are left?"* → 2,225.
- Intermediate: *"A video reached 20,944 views... rounds to the nearest
  thousand"* → 21,000.
- Advanced (multi-step): *"A team collected 298,031 stamps in week one and
  39,326 more in week two. They then used 203,952 to post letters. How many
  are left?"* → 337,357 − 203,952 = 133,405 (two chained operations, the
  genuine multi-step reasoning the spec requires at 40%).

**What it assesses:** reading comprehension plus the correct operation choice
— the whole point of this skill is that the operation isn't announced, only
implied by the story. `multiStepScenario`/`digitValueScenario` are the two
templates that tie this skill back to Skills 5 and 1 respectively, which is
what makes this "integrated reasoning" rather than a ninth copy of the
arithmetic skill with a sentence glued on.

**Advanced genuinely harder:** yes — `multiStepScenario` is the only
genuinely two-operation word problem in the unit, and `digitValueScenario`
requires recognizing a place-value question dressed as a real-world quantity
(views on a video), not stated as "what digit is in the hundreds place."

**Gaps identified and fixed before commit:** `question.display` is empty for
every word-problem template (the full sentence is the prompt, not a separate
math line) and for `compareScenario`/`constructChoice`-style questions —
`PlaceValueQuestionScene` originally still rendered an empty bordered box for
these (visible on `constructChoice` questions across Skills 6 and 7 before
this pass). Fixed by skipping the display box whenever `display === ''`,
rather than only for `compareSymbol`.

## Unit-wide gaps (not skill-specific)

1. **Generic rather than misconception-targeted multiple-choice distractors.**
   `numericMultipleChoice` (used by Skill 1's `digitValue`, Skill 4's
   `roundTo`) builds distractors by picking random numeric neighbors within a
   spread of the correct answer. These are mathematically plausible and pass
   every soundness check (unique, never accidentally correct), but they don't
   specifically target the two or three classic mistakes a 4th grader
   actually makes for that question type (e.g. "digit instead of digit
   value," "rounded the wrong direction"). Skill 2's `recognizeDecomposition`
   and Skill 4's `nearestBenchmark` both hand-build misconception-targeted
   options instead, and read noticeably sharper for it. **Recommended
   follow-up:** give `digitValue` and `roundTo` the same hand-built-option
   treatment (e.g. always include "just the digit," "one place too small/
   large," and "rounded the wrong way" as named distractors, falling back to
   numeric filler only if one collides with the correct answer) — not done in
   this pass, to keep the change surface for this already-large unit
   bounded; documented here instead of silently shipped.
2. **`PlaceValueQuestionScene`'s numeric input had a real (now-fixed) mobile
   layout bug**, found through manual browser testing rather than the
   automated suite (jsdom doesn't lay out flexbox): the "Check" button could
   render pushed off-screen on a 390px viewport, reproducing on roughly half
   of page loads depending on which font was active at first paint. Root
   cause: `.pv-numeric-input` used `flex: 1` without `min-width: 0`, so its
   default browser-intrinsic minimum width could exceed its share of the row.
   Fixed with the standard `min-width: 0` flex-item fix, verified with 120
   repeated headless-browser loads post-fix (0 failures, versus ~50% before).
3. **`compareSymbol` had no dedicated mobile layout** and relied on
   `flex-wrap`, which could strand one of the two compared numbers alone on
   its own line, divorced from the `<`/`=`/`>` choice between them. Fixed
   with an explicit stacked layout under 430px (number, then the symbol row,
   then the other number).

## Representative mock exam inspection

Generated and played through a full 22-question mock exam end to end (real
browser, not a mock), specifically checking for the failure modes in the
build spec:

- **Too easy / trivially guessable:** not found. The 20/40/40 basic/
  intermediate/advanced split (`buildMockExamSlots`) is enforced exactly —
  verified by `decimalExamPrepEngine.test.ts` across 50 random seeds.
- **Ambiguous or duplicate-correct-answer questions:** not found. Every
  generator's own `assert*QuestionIsSound` self-check runs on every mock exam
  question as part of `buildQuestionsForSlots`'s underlying builders (same
  functions the per-skill test suites exercise hundreds of times each).
- **Impossible constraints:** the one real instance (Skill 7's
  `rangeAndDigit`) is fixed — see above.
- **Wrong computed results:** none found in manual spot-checking (see the
  worked arithmetic above for Skills 1–8); every skill's test suite also
  asserts `question.validate(question.correctAnswerDisplay)` over hundreds of
  generated samples.
- **Absurd/implausible distractors:** none found that are actually wrong;
  see "generic distractors" above for a *quality*, not correctness, gap.
- **Unintended multiple-correct-answer questions:** the only
  multiple-valid-answer templates (`numberBetween`, `rangeAndDigit`,
  `targetSum`, `constructEven`, `constructThreshold`) are all flagged with
  `hasMultipleValidAnswers: true` and validated via a real predicate, not
  string equality — confirmed by each skill's "rejects a bad question" test
  deliberately corrupting `validate` and checking the soundness check catches
  it.
- **Tedious counting-based questions:** none — every skill works from stated
  numbers/digits, never "count the dots."
- **Repetitive question formats back-to-back:** the mock exam shuffles both
  skill assignment and difficulty assignment independently
  (`buildMockExamSlots`), so the same template cannot dominate a run by
  construction, though two of the same *skill* (not necessarily the same
  template) can land adjacent by chance — considered acceptable, since the
  skill itself is never announced to the student and the templates within a
  skill differ meaningfully.
- **Wrong Hebrew mathematical terminology:** spot-checked against the Shvilim
  textbook's standard terms — **מאות/אלפים/עשרות האלפים** (hundreds/
  thousands/ten-thousands), **עיגול** (rounding), **זוגי/אי-זוגי** (even/
  odd), **פירוק** (decomposition) all match standard usage. No invented or
  nonstandard terms found.
- **Review screen gap (found and fixed in this pass):** `compareSymbol`
  questions deliberately have `display: ''` (the two numbers are shown as
  the scene's own chips while answering, not a bordered display line) — but
  the mock exam's end-of-exam review list only rendered `question.display`,
  so a missed comparison question showed no numbers at all, just the `<`/`>`
  symbols with nothing to compare. Fixed by reconstructing the two numbers
  from `interaction.left`/`.right` specifically for the review list, verified
  by forcing a `compareSymbol` miss and confirming the numbers now appear.
- **RTL/bidi review-line direction (found and fixed in this pass):** the
  review list's "your answer / a correct answer" line originally forced
  `dir="ltr"` on the *entire* line (Hebrew labels and numbers together) to
  keep the numbers from reversing — which also flattened the Hebrew label
  words into unnatural left-to-right order. Fixed by isolating only the
  numeric values in `dir="ltr"` spans, leaving the Hebrew text in its natural
  RTL flow (the same pattern the rest of the app already uses correctly
  elsewhere, e.g. every skill's own in-scene feedback explanation line, which
  was never forced and was confirmed correct by direct DOM assertions, not
  just visual reading).

## Diagnostic-specific finding (found and fixed in this pass)

The diagnostic's "what to practice next" recommendation originally only
considered skills classified as confidently `weak` (≥3 sampled questions,
<60% correct). A 12-question diagnostic spread across 8 skills never gives
any single skill more than 2 questions, so that classification was
**unreachable from the diagnostic's own data** — the recommendation always
fell through to "nice work across the board," regardless of actual score (a
25%-overall run and a 100%-overall run showed the identical message). Fixed
by recommending whichever answered skill(s) scored lowest (capped at three),
independent of the stricter confidence bucket — the per-skill *display* still
correctly shows "too few questions to be sure yet" for every skill (since
none reach the confidence threshold), so the hedging the spec asks for is
preserved; only the *recommendation* logic needed decoupling from it.
