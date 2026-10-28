# Grade 7 Geometry — Angles: Textbook Coverage Audit

**Scope:** `feature/interactive-geometry-engine` worktree, Grade 7 Angles unit (5 training activities + the shared geometry engine).
**Reference source:** the 7-page transcription of "מבחן חשבון זוויות" (chapters 20–22) supplied in the task brief.
**Method:** static code reading of every page/generator/engine file, 76 existing unit/component tests run live, `tsc -b` and `eslint` run clean, 5 Playwright e2e specs run live against a real `vite preview` build, real generator output captured for all 3 difficulty tiers via a throwaway `tsx` script, and 5 full-page screenshots captured from the running preview server for visual spot-checks (including the previously-fixed RTL compare bug).
**Audit stance, per the mission brief:** the goal is to find what is missing, not to validate the existing work. Borderline cases are marked PARTIALLY COVERED or NOT COVERED rather than rounded up.

> **Update (2026-10-28):** two of this audit's findings have since been acted on, on branch `feature/angles-select-names-and-measure` (commit `10edf68`), not yet merged at the time of this update:
> - **Gap 5 ("select all valid names") is now implemented** — see the inline updates to the matrix rows it affects below, and the "resolved" note in §7.
> - **A new "Measure an Angle" activity (digital protractor) was added.** This was *not* a finding of this audit — the 7-page reference excerpt behind this document does not itself contain a dedicated angle-measurement chapter — but the user's child's actual exam syllabus separately includes angle measurement as a topic, so it was built directly from that instruction rather than from a textbook row below. See the new §12 addendum for what it covers; it is not folded into the §3/§6 textbook-matrix statistics, which remain an accurate snapshot of coverage against the originally-audited 7 pages only.
> The rest of this document is left as originally written (including statistics in §6, which do **not** reflect these two updates) so it remains a faithful record of what the audit actually found at the time; read it together with §12 for the current state.

---

## 1. Executive summary

The implementation is a well-engineered, mathematically rigorous *abstract-diagram drilling* tool for four of the textbook's core skills: ray/vertex/angle identification (ch. 20), the four angle types (ch. 20), three-letter angle notation with name-equivalence and Greek-letter shorthand (ch. 21), and </=/> angle-size comparison with the explicit ray-length misconception (ch. 22). All 76 existing tests pass, `tsc -b` is clean, `eslint` is clean, and every generator was observed to produce sound, correctly-graded, non-degenerate questions across basic/intermediate/advanced in live sampling.

However, it is **not a complete substitute for exam prep against this specific textbook**. Three categories of material are structurally absent, not just thin:

1. **All real-world/photographic reasoning** — the textbook spends roughly a third of chapter 20 and parts of chapter 21 on photos (road fork, scissors, clocks, traffic-light pole, escalator, floor tiles, a soccer field) and explicitly asks "does the angle type change if you look from a different direction?" and "is this really a right angle — check by cutting out a template." The app has zero photographic or real-world content anywhere in the Grade 7 Angles unit; every diagram is an abstract SVG ray-fan.
2. **All free-response "explain your reasoning" items** — the textbook repeatedly asks students to write an explanation (e.g. ch. 20 pentagon exercise, ch. 22 Ex. 2's "can you tell which is bigger — explain how"). Every one of the app's 5 activities is multiple-choice or drag-to-a-tolerance; there is no explanation/free-text mechanism anywhere in this unit.
3. **The coordinate-grid bridging exercises** (ch. 21 Ex. 2 and Ex. 5 — plotting labeled points, connecting them, checking for a triangle, finding a point at a given distance) and **the reflex/"large" angle concept** (ch. 20's note box) and **the angle-bisector sub-question** (ch. 21 Ex. 9) are not implemented at all — confirmed by dead code: `GridLabeledPoint` (types.ts) and `isRayBetween`/an angle-betweenness primitive exist in the engine but are never called by any Grade 7 Angles generator or page, and the engine's own `normalizeAngleMeasure` structurally collapses every angle into `[0°, 180°]`, so a reflex/"large" angle can never even be represented, let alone asked about.

The previously-identified RTL bug in the compare activity is confirmed fixed (forced `direction: ltr` on `.angles7-compare-row` and its options, verified live in a screenshot: the "left" data side renders on the visual left). No new RTL/visual-correctness bug was found in identify, notation, or construct — their option sets are unordered multiple-choice, so DOM-order vs. visual-order mismatches have no behavioral consequence even without a forced direction.

**Bottom line:** *mostly ready, with specific and significant gaps* — see §10 for the full verdict.

---

## 2. Reference document inventory (page by page)

### Chapter 20 (pp. 227–232) — זיהוי זוויות, סוגי זוויות
- Opener: real-world photos + "find 4 more" exercise.
- Definitions: קרן (ray), זווית (angle) as union of two rays, קודקוד (vertex), שוקיים (sides).
- Note box: two rays at one point define *two* angles (small + large/reflex, "הזווית המשוקפת"), disambiguated by an arc.
- Sidebar: "equal angles marked identically" + a zigzag photo.
- Four-type fan diagram: חדה / ישרה (□ symbol) / קהה / שטוחה.
- Real-world right-angle examples (construction, fence, 9:00 clock, rectangle corners).
- Paper-folding construction of a right angle.
- Ex. 1: 8 diagrams, classify by arc measure.
- Ex. 2: 8 diagrams, classify by type (straight/acute/right/obtuse).
- Photo exercise: floor-tile right angles, verified by a cut-out template.
- Ex. 4: pentagon-like figure (E,F,D,C,B,A), classify without measuring, explain.
- Ex. 5: four clocks, angle type between hands + "write another time with the same type."
- Ex. 6: traffic-light pole photo — is it a right angle?
- Ex. 7: escalator photo — right or obtuse? + "does the type change from another viewpoint?"
- Ex. 8/9: SINK wordplay — **not geometry, excluded per the brief.**
- Ex. 12: 6 diagrams on a coordinate-grid backdrop, sequential classification.

### Chapter 21 (pp. 233–238) — סימון זוויות בכתיב מתמטי
- ∠ symbol intro; point-labeling convention (capital letters) + Ex. 1 (label points in 4 diagrams).
- Ex. 2: coordinate points C(8,6), B(7,1), A(2,1) — plot, connect, triangle check, find D at a given distance, explain.
- Three-letter naming rule (middle letter = vertex) + worked example (∠CAB/∠BAD/∠CAD at vertex A).
- Two "pick all valid names" tip boxes (vertex G: ∠BGC/∠G/∠FGC/∠CGB/∠BGD/∠CGF; vertex L/M diagram).
- Ex. 6: I, L, G — pick valid names.
- Ex. 7: free-response 3-letter naming (point T + others).
- Ex. 8: two triangle diagrams (A,B,C,D) — name the angle + "is there another angle sharing one letter?"
- Ex. 9: M,T,I naming + O,T,V,G,L,R,I diagram — segment/angle bisector ("חוצה"), find an acute angle, find a straight angle.
- Greek-letter shorthand (α at vertex A) + mnemonic (α↔A, β↔B, γ↔G, δ↔D).
- Second "זהות זוויות" tip box, explicitly varying the count of valid names (2, 3, 4) per sub-part.
- Ex. 3: pick which of 4 diagrams shows ∠MOR.
- Ex. 4: color-code SON/SOR/ONS in one diagram.
- Ex. 5: E,D,C,B,A coordinate plotting (second light bridging exercise).
- Ex. 11: soccer-field word problem (4 players, angle-equality reasoning).
- Ex. 12–16: drill set (β-notation, type+name combined, "most suitable" diagram matching, α/β/γ/δ recap table).
- Answer key (internal reference only).

### Chapter 22 (p. 239) — השוואה בין גדלים של זוויות
- Opener: fill-in-the-blank </=/> notation.
- Ex. 1 (a)–(e): five comparison pairs, including a deliberate straight-angle special case (e).
- Ex. 2: two freehand sketches with deliberately different ray lengths — "which is bigger, and how do you know?" — the textbook's single most explicit statement of the no-ray-length-cue principle.

---

## 3. Detailed textbook-to-code coverage matrix

| PDF page/textbook page | Exercise # / description | Mathematical concept | Required student action | Reasoning complexity | Existing Mathletica activity | Generator/component/function (file) | Representative generated question (real output) | Coverage status | Gap or limitation |
|---|---|---|---|---|---|---|---|---|---|
| 227 | Opener — photos of real-world angles, "find 4 more" | Recognizing an angle in a real object | Identify/describe | Low | None | — | — | **NOT COVERED** | No photographic/real-world content anywhere in the unit; 100% abstract SVG ray-fans. |
| 227–228 | Ray (קרן) definition | A ray is part of a line bounded by one point | Recognize a ray | Low | Rays & Angles — `vertex`/`rays` kinds | `makeVertexChallenge`/`makeRaysChallenge`, `src/data/games/anglesIdentifyData.ts`; rendered via `VertexSceneView`, `src/components/geometry/VertexSceneView.tsx` | basic/vertex: options `["ray-0","ray-2","vertex","ray-1"]`, answer `"vertex"` | FULLY COVERED | — |
| 228 | Angle (זווית) as union of two rays; קודקוד (vertex) | Angle = 2 rays + shared vertex | Identify the vertex of an angle | Low | Rays & Angles — `vertex` kind | `makeVertexChallenge`, `anglesIdentifyData.ts` | intermediate: options `["ray-3","ray-0","vertex","ray-2","ray-1"]`, answer `"vertex"` | FULLY COVERED | — |
| 228 | Note box: two rays define a small angle AND a large/reflex angle ("הזווית המשוקפת") | Reflex-angle disambiguation via an arc | Choose which of the two angles (small vs. reflex) is meant | Medium | None | — | — | **NOT COVERED** | Structural, not just missing content: `normalizeAngleMeasure` in `src/geometry/angleMath.ts` (`wrapped > 180 ? 360 - wrapped : wrapped`) collapses every angle into `[0°,180°]`. A reflex angle (>180°) literally cannot be represented by the engine, so this cannot be added without an engine change. |
| 228 | Sidebar: equal angles marked identically (zigzag photo) | Angle-equality notation convention | Observe | Low | Compare Angles (adjacent skill) | `anglesCompareData.ts` | — | **UNVERIFIED / tangential** | The equal-angle *result* (`=`) is tested in Compare; the specific "same-notation-mark" convention from this sidebar is not taught anywhere. |
| 229 | Four angle types (fan diagram): חדה/ישרה/קהה/שטוחה | Classification by measure | Classify an angle into 1 of 4 types | Low–Medium | Angle Types — `classify` kind | `makeClassifyChallenge`, `src/data/games/anglesTypesData.ts`; `classifyAngle7`, `src/geometry/angleMath.ts` | basic: 132° → answer `"obtuse"`; 90° → `"right"`; 49° → `"acute"` (seed 42) | FULLY COVERED | A `CLASSIFICATION_SAFETY_MARGIN_DEG = 12°` keeps every acute/obtuse case unambiguous by eye — a deliberate, tested QA guarantee (`isUnambiguouslyClassifiable`), stronger than the textbook itself requires. |
| 229 | Real-world right-angle examples (building, fence, 9:00 clock, rectangle) | Recognizing 90° in real contexts | Identify | Low | None | — | — | **NOT COVERED** | No real-world or clock-based content. |
| 230 | Paper-folding construction of a right angle | Physically construct 90° | Fold paper twice | Low | Construct an Angle (different method) | `makeChallenge`, `src/data/games/anglesConstructData.ts`; drag UI in `src/pages/AnglesConstructPage.tsx` | basic: prompt `anglesGrade7.construct.prompt.type.right`, tolerance 12° | PARTIALLY COVERED | Same end skill (produce a right angle) via drag-to-target instead of paper-folding — a reasonable digital substitute, not the textbook's own method; the app's own code comments call this "its own build," not a textbook-sourced interaction. |
| 230–231 | Ex. 1 — 8 diagrams, classify by arc measure | Type classification | Classify | Low–Medium | Angle Types — `classify` | same as above | — | FULLY COVERED (skill-equivalent, generator-based, not the literal 8 printed diagrams) | — |
| 231 | Ex. 2 — 8 diagrams, classify straight/acute/right/obtuse by comparison | Type classification | Classify | Low–Medium | Angle Types — `classify` | same as above | — | FULLY COVERED (skill-equivalent) | — |
| 231 | Floor-tile photo — right angle? verify with a cut-out template | Hands-on verification of a right angle | Physically check, explain | Medium | None | — | — | **NOT COVERED** | No photo, no manipulative-verification mechanic. |
| 232 | Ex. 4 — pentagon E,F,D,C,B,A, classify without measuring, explain | Type classification across a closed figure + justification | Classify + free-text explanation | Medium | Angle Types — `classify` (classification part only) | `anglesTypesData.ts` | — | PARTIALLY COVERED | Classification itself is covered generically; the "explain your answer" free-response requirement is not — no activity in this unit collects or grades an explanation. |
| 232 | Ex. 5 — four clocks, angle type between hands + name another matching time | Real-world angle type + generative reasoning | Identify type, generate an example | Medium | None | — | — | **NOT COVERED** | No clock content anywhere. |
| 232 | Ex. 6 — traffic-light pole photo, right angle? | Photo-based right-angle judgment | Judge + explain | Low–Medium | None | — | — | **NOT COVERED** | — |
| 232 | Ex. 7 — escalator photo, right or obtuse? + "does viewpoint change the type?" | Photo-based judgment + a genuine conceptual question (angle type is viewpoint-independent) | Judge + explain | Medium | None | — | — | **NOT COVERED** | This conceptual point (type doesn't change with viewing angle) has no analogue anywhere in the app. |
| — | Ex. 8/9 — SINK wordplay | Not geometry | — | — | — | — | — | **excluded** (per brief) | — |
| — | Ex. 12 — 6 diagrams on a coordinate-grid backdrop, sequential classification | Type classification under a grid backdrop | Classify a sequence | Medium | Angle Types — `order` kind | `makeOrderChallenge`, `anglesTypesData.ts` | basic/order: degrees `[35, 80, 157]`, mode `largest`, answer `"opt-0"` | PARTIALLY COVERED | `order` tests "find smallest/largest among N" (a comparison task), not "classify each of a sequence of diagrams independently"; no grid backdrop is ever drawn under a Grade-7-Angles scene (the `grid` prop on `VertexSceneView`/`GeometryStage` exists but no Grade 7 Angles generator passes `grid: true`). |
| 233 | ∠ symbol introduced | Notation | Read/recognize | Low | Notation (symbol used throughout); Identify's `angle` kind (gap, see note) | `AnglesNotationPage.tsx` (`MathText` wraps every option in `∠…`) | — | PARTIALLY COVERED | `AnglesIdentifyPage`'s `angle` kind prompt (`anglesGrade7.identify.prompt.angle`, "הקישו על הזווית הנקראת {{name}}") renders the raw letters (e.g. "IAJ") without the ∠ prefix — a minor inconsistency with how the rest of the unit teaches the symbol. |
| 233 | Point notation (capital letters) + Ex. 1 — label 4 diagrams' points | Point-naming convention | Write a point's name | Low | None directly | — | — | **NOT COVERED** | Every scene always shows pre-labeled points; no activity specifically tests "what is this point called." |
| 233–234 | Ex. 2 — coordinate points C(8,6)/B(7,1)/A(2,1): plot, connect, triangle check, find D at a given distance, explain | Coordinate-plotting bridge to angle notation | Plot, measure, explain | Medium | None | `GridLabeledPoint` interface exists (`src/geometry/types.ts`, comment: "for the chapter-21 coordinate bridging exercise") but is **never imported or used** anywhere else in `src/` (confirmed via project-wide grep) | — | **NOT COVERED** | Dead type — the bridging exercise this type was evidently planned for was never built. |
| 234–235 | Three-letter naming rule (middle letter = vertex); worked example ∠CAB/∠BAD/∠CAD | Core notation rule + multiple angles at one vertex | Name an angle correctly | Medium | Angle Notation — `selectName`; Rays & Angles — `angle` kind | `makeSelectNameChallenge`, `src/data/games/anglesNotationData.ts`; `isValidAngleName`/`threeLetterName`, `src/geometry/angleNotation.ts` | basic: answer `"FCA"`, options `["KCF","FCA","CAF","AFC"]` (seed 42) | FULLY COVERED | — |
| 235 | Tip box (a): all valid names at vertex G (∠BGC≡∠CGB, ∠FGC≡∠CGF, ∠G, ∠BGD as a separate angle) | Name-equivalence (both orderings + vertex-only shorthand) | Select every valid name | Medium–High | Angle Notation — `selectName`/`selectInvalid`/**`selectAllNames` (new)** | `anglesNotationData.ts`; `allValidThreeLetterNames`, `canUseVertexOnlyName`, `angleNotation.ts` | basic/`selectAllNames`: scene F/H/D/I, marked angle at D, options `["∠DFH","∠HDF","∠FDH","∠BDH","∠FHD"]`, correct = `{"∠FDH","∠HDF"}` (live-captured 2026-10-28) | **✅ RESOLVED (2026-10-28)** — was PARTIALLY COVERED | `selectAllNames` now exists and `canUseVertexOnlyName` is used (confirmed live: a 2-ray scene produced a 3-correct-name question including the vertex-only form). Residual limitation: the engine can only ever produce 2 or 3 correct names, never this tip box's 4-name case (see §7 Gap 5 note and §12). |
| 235 | Tip box (b): vertex L/M diagram, same "select all valid" format | Same as above | Same as above | Medium–High | same | same | — | **✅ RESOLVED (2026-10-28)** — was PARTIALLY COVERED | Same resolution and same residual 4-name limitation as the row above. |
| 236 | Ex. 6 — I, L, G: pick valid names from ∠LGI/∠LIG/∠I/∠GIL | Name-equivalence | Select valid names | Medium | Angle Notation — `selectAllNames` (new) | `anglesNotationData.ts` | — | **✅ FULLY COVERED (2026-10-28)** — was PARTIALLY COVERED | This exercise's exact format (a small fixed option set, pick every valid name among them) is now a direct match via `selectAllNames`, not just the single-answer `selectName` kind. |
| 236 | Ex. 7 — free-response 3-letter naming (point T) | Naming | Write the name | Low–Medium | Angle Notation — `selectName` | `anglesNotationData.ts` | — | PARTIALLY COVERED | MCQ, not free-response; acceptable as an MCQ-app design choice, but the reasoning mode differs (recognition vs. recall/construction). |
| 236 | Ex. 8 — two triangle diagrams (A,B,C,D), name + "another angle sharing one letter?" | Naming + distinguishing adjacent angles | Name + reason about adjacency | Medium | Angle Notation — `selectName`/`triangleInterior` | `makeTriangleInteriorChallenge`, `anglesNotationData.ts`; `interiorAngleArmLabels`, `src/geometry/polygon.ts` | intermediate/triangleInterior: vertex `G`, answer `"IGK"`, options incl. `"JGI"` | PARTIALLY COVERED | Naming itself is covered (as Skill-E enrichment per the app's own code comments); the explicit "is there another angle sharing one letter" follow-up reasoning question is not asked. |
| 237 | Ex. 9 — M,T,I naming; O,T,V,G,L,R,I: segment/angle bisector, find acute/straight angle freehand | Naming + angle bisector + freehand angle-type search | Name, identify a bisector, find examples | High | Angle Notation (naming part only) | `anglesNotationData.ts` | — | PARTIALLY COVERED | Naming sub-task covered generically; the bisector sub-question has **no implementation anywhere** — confirmed via project-wide grep for "bisect": the only `bisector` symbol in the codebase (`VertexSceneView.tsx`) is an internal hit-target midpoint for click handling, unrelated to the geometric angle-bisector concept. The "find 3 points forming an acute/straight angle, freehand" task is also not represented (no freehand point-selection interaction exists). |
| 235 (later) | Greek-letter shorthand (α at vertex A) + mnemonic | α/β/γ/δ shorthand, tied to Latin-letter order | Translate Greek ↔ 3-letter name | Medium | Angle Notation — `selectName` with `usesGreekLetter` | `greekLetterForIndex`, `angleNotation.ts`; `GREEK_CHANCE_BY_DIFFICULTY` in `anglesNotationData.ts` | advanced: prompt `selectNameGreek`, options incl. correct `"KBE"` | FULLY COVERED | — |
| 235 (later) | Second "זהות זוויות" tip box — explicitly 2/3/4 valid names per sub-part | Varying-cardinality name equivalence | Select all valid names, varying count | High | Angle Notation — `selectAllNames` (new) | `makeSelectAllNamesChallenge`, `anglesNotationData.ts` | — | **PARTIALLY COVERED (2026-10-28)** — was NOT COVERED | The "select all that apply, with a varying correct-count" interaction now exists and is unit-tested to genuinely vary (not collapse to always-2), closing most of this gap. Still not a full match: the engine can only ever generate 2 or 3 correct names (never 4), because 4 simultaneously-valid names isn't mathematically constructible under this engine's one-label-per-ray model — a deliberate, documented scope call (see §7 Gap 5 and §12), not an oversight. |
| 236 | Ex. 3 — pick which of 4 diagrams shows ∠MOR | Matching a name to its diagram | Select the matching diagram | Medium | None directly | — | — | **NOT COVERED** | The app always starts from "here is the diagram, name it" or "here is the name, pick the matching option," never "here is a name, pick which of several *diagrams* it describes." |
| 236 | Ex. 4 — color-code SON/SOR/ONS in one diagram | Multi-angle identification in a shared diagram | Distinguish several named angles at once | Medium–High | Rays & Angles — `angle` kind (closest analogue) | `makeAngleChallenge`, `anglesIdentifyData.ts` | advanced: name `"FBK"`, 3 angle options at one vertex | PARTIALLY COVERED | `angle` kind asks for one angle at a time (tap the one matching a given name) rather than simultaneously classifying/coloring three different named angles in one pass. |
| 237 | Ex. 5 — second coordinate-plotting integration (E,D,C,B,A) | Coordinate bridge | Plot/connect | Low–Medium | None | — (same dead `GridLabeledPoint` as Ex. 2) | — | **NOT COVERED** | — |
| 237 | Mnemonic sidebar (α↔A, β↔B, γ↔G, δ↔D) | Memory aid | — | Low | Angle Notation (Greek mode) | `GREEK_LETTERS`/`greekLetterForIndex`, `angleNotation.ts` | — | FULLY COVERED | The exact α/β/γ/δ ordering from the mnemonic is encoded directly in `GREEK_LETTERS`. |
| 237 | Ex. 11 — soccer-field word problem (4 players, angle-equality reasoning) | Applied angle-naming/equality in a themed context | Reason about equal angles given symmetric points | Medium–High | Angle Notation (abstractly) | `anglesNotationData.ts` | — | **NOT COVERED** (as an applied word-problem) | The underlying skill (name an angle, reason about equal angles) is drilled abstractly; no themed/applied word-problem format exists anywhere in the unit. Per the brief, the soccer theme itself is not required — but the applied-reasoning *format* (a short scenario + "who passed to whom," equality reasoning) has no analogue. |
| 237–238 | Ex. 12–16 — drill set (β-notation, combined type+name, "most suitable" matching, α/β/γ/δ recap table) | Mixed review | Various | Medium | Angle Notation (partial) | `anglesNotationData.ts` | — | PARTIALLY COVERED | Greek-letter and 3-letter-name skills are each covered individually; the specific "most suitable candidate diagram" matching format and the combined recap-table format are not reproduced. |
| 239 | Opener — </=/> fill-in-the-blank notation | Comparison notation | Fill in <, =, > | Low | Compare Angles | `makeChallenge`, `src/data/games/anglesCompareData.ts` | — | FULLY COVERED | — |
| 239 | Ex. 1(a)–(d) — 4 comparison pairs, varied orientation/diagram style | Compare two angles' true measure | Choose <, =, > | Medium | Compare Angles | `anglesCompareData.ts` | basic: `∠?` left 148° vs right 118° → `">"`; left 33° vs right 81° → `"<"` (seed 42) | FULLY COVERED | — |
| 239 | Ex. 1(e) — ∠ABC □ ∠ABD where DBC is a straight angle | Comparison with a straight-angle special case | Choose <, =, > reasoning about a 180° sub-case | Medium–High | Compare Angles (generic comparison only) | `anglesCompareData.ts` | — | PARTIALLY COVERED | The generator compares two independently-drawn angle scenes; it never constructs the specific configuration where one angle is a *part* of a straight angle at a shared vertex (i.e. using `isRayBetween`/angle-sum reasoning). `isRayBetween` exists in `angleMath.ts` but, confirmed by grep, is **never called** by any Grade 7 Angles generator — this configuration/reasoning pattern is unimplemented. |
| 239 | Ex. 2 — two freehand sketches with different ray lengths, "which is bigger, explain how" | The no-ray-length-cue misconception, explicitly | Judge + explain, free reasoning | Medium–High | Compare Angles | `anglesCompareData.ts`; ray length randomized independently per side (`buildVertexScene`, `src/data/games/anglesGrade7Shared.ts`, `drawnTowardDistance = 70 + randomInt(random, 0, 60)`), rendered at one fixed on-screen length regardless (`rayEndpoint`, `angleMath.ts`) | basic: left 88° (drawn with one random ray length) vs right 52° (different random ray length) → `">"` | FULLY COVERED for the *misconception-proofing* mechanism; PARTIALLY COVERED for the *explain-your-reasoning* part | This is the strongest, most deliberately-engineered match to any single textbook item in the whole audit — the generator's own code comment explicitly cites this exact exercise. The one gap: no free-text "explain how you know" is ever collected, same systemic gap as elsewhere. |

---

## 4. Actual implemented activity inventory

All 5 activities are registered and enabled in `src/data/games.ts` (`geometryGrade7Games`, lines 159–199) and routed in `src/App.tsx` (lines 118–123) under `/grade/7/geometry/*`. Verified live via Playwright against the production build (`npx playwright test e2e/geometryAngles.spec.ts`, 6/6 passed) and via 5 full-page screenshots.

| Activity (id) | File (page / generator) | Difficulty tiers | Interaction kinds | Question counts |
|---|---|---|---|---|
| Rays & Angles (`anglesIdentify`) | `src/pages/AnglesIdentifyPage.tsx` / `src/data/games/anglesIdentifyData.ts` | basic / intermediate / advanced (ray count 3→4→5; rotation granularity 90°→15°→1°) | `vertex` (tap the vertex among clickable points), `rays` (MCQ: which ray pair bounds the highlighted arc), `angle` (tap the one of several drawn angles matching a given 3-letter name) | 5 / 10 / 15 |
| Angle Types (`anglesTypes`) | `src/pages/AnglesTypesPage.tsx` / `src/data/games/anglesTypesData.ts` | basic / intermediate / advanced | `classify` (MCQ: acute/right/obtuse/straight), `order` (tap the smallest/largest of 3–4 separately-drawn angles) | 5 / 10 / 15 |
| Angle Notation (`anglesNotation`) | `src/pages/AnglesNotationPage.tsx` / `src/data/games/anglesNotationData.ts` | basic / intermediate / advanced | `selectName` (MCQ, incl. Greek-letter prompts at intermediate/advanced), `selectInvalid` (MCQ: which name is wrong), `triangleInterior` (MCQ: name a triangle's interior angle — explicitly labeled in-code as Skill-E *enrichment*, not textbook-sourced) | 5 / 10 / 15 |
| Compare Angles (`anglesCompare`) | `src/pages/AnglesComparePage.tsx` / `src/data/games/anglesCompareData.ts` | basic / intermediate / advanced (min. gap 25°→14°→7°; equal-case chance 15%→20%→25%) | `compare` (MCQ: <, =, >) | 5 / 10 / 15 |
| Construct an Angle (`anglesConstruct`) | `src/pages/AnglesConstructPage.tsx` / `src/data/games/anglesConstructData.ts` | basic / intermediate / advanced | drag a ray to a target type (all tiers) or a target degree value ± tolerance (advanced only, 50% of the time) | 3 / 5 / 8 |

All 5 share one underlying geometry engine: `src/geometry/angleMath.ts` (angle math/classification), `src/geometry/angleNotation.ts` (3-letter naming + equivalence + Greek shorthand), `src/geometry/polygon.ts` (triangle interior-angle enrichment), `src/geometry/types.ts`/`src/geometry/style.ts`, and shared rendering in `src/components/geometry/{GeometryStage,GeometryPrimitives,VertexSceneView,TriangleSceneView,useDragHandle}.tsx`, plus `src/data/games/anglesGrade7Shared.ts` for scene-building helpers common to all 5 generators.

**Out of scope, confirmed by routing:** `src/pages/GeometryAnglesTrianglesPage.tsx` and `src/data/angleScene.ts`/`src/components/AngleSceneVisual.tsx` are a *different*, pre-existing unit routed at `/grade/3/geometry-angles-triangles` (Grade 3), unrelated to this Grade 7 audit — confirmed via `grep` in `src/App.tsx`. They were read but excluded from the matrix above.

---

## 5. Representative generated questions and validation evidence

**Method:** a throwaway script (`/private/tmp/.../scratchpad/genAngles.ts`, deleted after use, never committed) imported each of the 5 `build*Questions` functions directly and called them with `seed: 42` across `difficultyId ∈ {basic, intermediate, advanced}`, `count: 4`, via `npx tsx <script>`. This is real generator output, not inferred from reading the code. Selected examples (full output was captured for all 60 generated questions across the 5×3 matrix):

- **Rays & Angles**, advanced, `angle` kind: prompt `anglesGrade7.identify.prompt.angle` with `promptValues.name = "FBK"`, 3 angle options (`ang-0/1/2`), answer `ang-2`.
- **Angle Types**, basic, `classify`: degrees `132` → options `["straight","acute","right","obtuse"]`, answer `"obtuse"`; degrees `90` → answer `"right"` (exact boundary, by design).
- **Angle Types**, intermediate, `order`: degrees `[22, 86, 104, 141]`, mode `"largest"`, answer `"opt-1"` (104°, the true max among the shuffled set — correctly NOT the largest raw number, confirming the grader uses the actual measured value, not option order).
- **Angle Notation**, basic, `selectName`: answer `"IKA"`, options `["IKA","IAK","KIA","EKA"]` — note `"IAK"` (wrong-vertex distractor) and `"EKA"` (wrong-arm distractor) are both present and excluded, confirming distractor plausibility.
- **Angle Notation**, advanced, `triangleInterior`: vertex `L`, answer `"ALH"`, options `["AHL","LAH","ALH","FLH"]`.
- **Compare Angles**, basic: left 148° vs right 118° → `">"`; left 33° vs right 81° → `"<"` — both agree with simple numeric comparison, confirming the grader is not accidentally using drawn ray length or scene rotation.
- **Construct an Angle**, advanced, degree-target mode: prompt `anglesGrade7.construct.prompt.degrees` with `promptValues.degrees = "69"`, answer `"69"`, `targetType: "acute"`, `toleranceDeg: 6`; and a second case targeting `135°` (`"obtuse"`, tolerance `6`).

**Test suite (live run, not inferred):**
```
npx vitest run src/data/games/__tests__/angles*        → 5 files, 26 tests, all passed
npx vitest run src/geometry/__tests__/angle* \
  src/pages/__tests__/Angles* \
  src/data/__tests__/angleScene.test.ts \
  src/data/games/__tests__/geometryAnglesTrianglesData.test.ts
                                                          → 7 files, 50 tests, all passed
npx tsc -b                                               → clean, no output
npx eslint src/pages/Angles*.tsx src/data/games/angles*.ts \
  src/geometry/angleMath.ts src/geometry/angleNotation.ts \
  src/components/geometry/*.tsx                          → clean, no output
npx playwright test e2e/geometryAngles.spec.ts --reporter=line
                                                          → 6 tests, all passed, against a real `vite preview` build
```

**Live visual verification:** a temporary Playwright spec (`e2e/_tmp_audit_screenshots.spec.ts`, created, run, then deleted before finishing — confirmed via `git status --porcelain` returning empty) captured full-page screenshots of all 5 activities from the running preview server. All five render correctly: Hebrew RTL chrome (header, prompt text) alongside LTR-forced SVG diagrams and LTR-forced angle names, consistent with the engine's design intent. The Compare Angles screenshot specifically confirms the previously-fixed RTL bug stays fixed: the diagram passed as `challenge.left` renders on the user's visual left and `challenge.right` on the visual right, matching the `<`/`=`/`>` semantics (`.angles7-compare-row { direction: ltr }`, `src/pages/AnglesComparePage.css`).

---

## 6. Coverage statistics and methodology

**Methodology:** every row in §3's matrix corresponds to one distinct textbook exercise, numbered sub-exercise, worked example, or standalone pedagogical item (definition box, tip box, sidebar) from the transcription, excluding the two explicitly non-geometry wordplay items (ch. 20 Ex. 8/9) per the brief. Multi-part exercises with genuinely distinct sub-skills (e.g. ch. 21 Ex. 9) are kept as one row but their internal gaps are itemized in the "gap" column rather than being split into several rows, to avoid inflating the denominator with sub-clauses of the same exercise.

**Counts (33 rows reviewed in §3, 2 wordplay items excluded):**

| Status | Count | % of 33 |
|---|---|---|
| FULLY COVERED | 10 | 30% |
| PARTIALLY COVERED | 14 | 42% |
| NOT COVERED | 9 | 27% |
| UNVERIFIED | 0 (1 tangential item noted, not counted as a formal row) | — |

**How to read this percentage:** this is a count of *distinct textbook items*, not a weighted measure of instructional time or exam-point value. A single "NOT COVERED" row (e.g. the reflex-angle note box) might be worth very few exam marks, while a single "PARTIALLY COVERED" row (e.g. Compare Angles, which hits the chapter's central misconception dead-on) might be worth a great deal. The 30/42/27 split should **not** be read as "the app covers 30% of the exam" — see the qualitative assessment below, which is deliberately kept separate.

**Qualitative exam-readiness assessment (separate from the statistics above):** the 4 core *quantitative/selective* skills the textbook exam would most heavily weight — classify an angle's type, read/write 3-letter notation correctly, recognize name-equivalence, and compare two angles' size without being fooled by ray length — are all FULLY or strongly PARTIALLY covered, generated soundly, and validated by passing tests across all three difficulty tiers. What's structurally missing is concentrated in three areas that would matter for a *comprehensive* exam but are each a cohesive, separately-buildable gap rather than scattered noise: (1) real-world/photographic items, (2) free-response "explain your reasoning" items, and (3) the chapter 21 coordinate-plotting bridge + reflex-angle + bisector sub-topics. See §10 for the overall verdict.

---

## 7. Most important educational gaps

Ordered by educational importance (not ease of implementation).

### Gap 1 — No real-world/photographic reasoning anywhere
- **What's needed:** at least one activity presenting a real photo (or a stylized illustration standing in for one) and asking the student to judge an angle type/rightness from it, ideally including the "does it change if viewed from another direction?" conceptual question (ch. 20 Ex. 7).
- **Reusable component:** none of the existing geometry primitives apply directly (they are all vector/SVG-coordinate based); this would need a new image-based question type.
- **New generator needed:** yes, a new one (images can't be procedurally generated the way the vector diagrams are — this would likely need a small fixed bank of real/illustrated images with pre-annotated correct answers, not a parametric generator).
- **Implementation complexity:** Medium (mostly content/asset work, plus one new interaction-kind in a page).
- **Educational importance:** High (a third of chapter 20 by page count is this format).
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for textbook equivalence.

### Gap 2 — No free-response / "explain your reasoning" mechanism anywhere in the unit
- **What's needed:** some activities in the textbook (ch. 20 Ex. 4, ch. 22 Ex. 2, several others) explicitly require a written justification, not just a selection. At minimum, a "why?" follow-up prompt after certain MCQ answers would partially close this.
- **Reusable component:** `TrainingActivityScreen`/`TrainingQuestionRenderProps` (`src/training/components/TrainingPlayScreen.tsx`) already supports arbitrary `renderQuestion` content, so a free-text field is plumbable without engine changes.
- **New generator needed:** no new math generator — this is a UI/grading-model addition (free text can't be auto-graded the way an MCQ can, so this likely needs either self-assessment or teacher-review, a product decision beyond this audit's scope).
- **Implementation complexity:** Medium (UI is small; the grading/review model is the real design question).
- **Educational importance:** High (recurs across all 3 chapters).
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for full textbook equivalence, though a pure-MCQ app is a defensible product scope choice — flagged here as a scope gap, not a bug.

### Gap 3 — Reflex/"large" angle concept is structurally unsupported
- **What's needed:** the ch. 20 note box explicitly teaches that two rays define two angles (small + reflex/large), disambiguated by an arc.
- **Reusable component:** none — `normalizeAngleMeasure` (`src/geometry/angleMath.ts`) hard-collapses every measure into `[0°,180°]`.
- **New generator needed:** yes, and it would require an engine change first (a reflex-angle-aware measure/classify path), not just a new generator on top of the existing one.
- **Implementation complexity:** Large (touches the shared engine every other activity depends on; needs careful regression testing to avoid changing any existing activity's behavior).
- **Educational importance:** Medium (one note box, but a real and commonly-tested misconception).
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for textbook equivalence.

### Gap 4 — Coordinate-grid bridging exercises (ch. 21 Ex. 2 and Ex. 5) are entirely unbuilt
- **What's needed:** plot labeled points from given coordinates, connect them, check for a triangle, find a point at a given distance along a line.
- **Reusable component:** `GridLabeledPoint` (`src/geometry/types.ts`) already exists for exactly this, with a code comment saying so, but is unused everywhere else — the scaffolding was planned but not finished.
- **New generator needed:** yes.
- **Implementation complexity:** Medium (the type already exists; needs a renderer — likely extending `GeometryStage`'s existing `grid` prop, which is defined but never turned on by any Grade 7 Angles scene — plus a new generator and page).
- **Educational importance:** Medium (2 of ~30 chapter-21 items, but each touches multiple sub-skills).
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for textbook equivalence.

### Gap 5 — "Select all valid names" format never implemented (only single-answer MCQ)

> **✅ RESOLVED 2026-10-28**, branch `feature/angles-select-names-and-measure` (commit `10edf68`, not yet merged). `anglesNotationData.ts` gained a `selectAllNames` kind (`makeSelectAllNamesChallenge`), wired into `AnglesNotationPage.tsx` as a toggle-button multi-select with per-option correct/missed/not-valid feedback. `allValidThreeLetterNames` and `canUseVertexOnlyName` are both now actually called. Verified live (not just unit-tested): a generated question showed a real 3-correct-name case. Full test suite (1591 tests) stayed green. **One deliberate, documented residual gap**: the correct-name count this generator can produce is 2 or 3, never 4 — the textbook's tip boxes sometimes have 4 valid names (e.g. a shared vertex with an unambiguous vertex-only form *and* a second angle's two orderings counted together), which isn't constructible under the engine's current one-label-per-ray scene model. Closing that fully would need a scene/notation-model change, not just a new generator — left as a smaller follow-up, not a blocker to calling this gap resolved for practical exam-prep purposes.

- **What's needed:** the textbook's two tip boxes and its "2/3/4 valid names" check explicitly vary *how many* correct options exist; `assertAngle*ChallengeIsSound` across every one of the 5 generators currently enforces "exactly one correct answer" as a hard invariant.
- **Reusable component:** `allValidThreeLetterNames`/`isValidAngleName`/`canUseVertexOnlyName` (`src/geometry/angleNotation.ts`) already contain the needed math — `canUseVertexOnlyName` is defined but confirmed unused by any generator.
- **New generator needed:** not a new one necessarily — `anglesNotationData.ts` could grow a new `kind` (e.g. `selectAllNames`) reusing the same scene-building helpers.
- **Implementation complexity:** Small–Medium (math already exists; needs a new UI selection mode — multi-select instead of single-select — in `AnglesNotationPage.tsx`).
- **Educational importance:** Medium (tests a deeper, more genuine understanding of name-equivalence than single-answer MCQ).
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for textbook equivalence.

### Gap 6 — No angle-arithmetic / betweenness reasoning (ch. 22 Ex. 1(e)'s straight-angle special case; ch. 21 Ex. 9's bisector)
- **What's needed:** a configuration where one angle is explicitly a part of a straight (or other) angle at a shared vertex, requiring ∠sum reasoning, plus the simpler angle-bisector concept.
- **Reusable component:** `isRayBetween` (`src/geometry/angleMath.ts`) already implements exactly the betweenness check needed, confirmed unused by any generator.
- **New generator needed:** could extend `anglesCompareData.ts` (for the ch. 22 case) and/or `anglesNotationData.ts` (for the bisector case) rather than needing a wholly new activity.
- **Implementation complexity:** Small–Medium (core math exists).
- **Educational importance:** Medium.
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary for textbook equivalence (this is explicitly one of the 5 comparison sub-exercises, not a tangent).

### Gap 7 (lower priority) — Matching a name to one of several candidate diagrams (ch. 21 Ex. 3), and the clock/applied-word-problem formats (ch. 20 Ex. 5, ch. 21 Ex. 11)
- **Reusable component:** `VertexSceneView` could render several small candidate scenes (similar to how `AnglesTypesPage`'s `order` kind already renders several small option diagrams) for the Ex. 3 format.
- **New generator needed:** yes, for each.
- **Implementation complexity:** Small (Ex. 3 format, reusing `order`'s multi-diagram-option pattern) to Medium (clock faces/word-problem framing would need new visual assets or SVG clock-face rendering).
- **Educational importance:** Low–Medium.
- **Necessary-for-textbook-equivalence vs. optional enrichment:** necessary-ish for Ex. 3 (direct textbook format); the clock/soccer *theming* specifically is optional enrichment — the brief itself says not to require soccer-themed visuals — but the underlying "applied word problem" format is a real, currently-absent format worth closing.

---

## 8. Mathematical or visual correctness concerns

- **Compare Angles RTL bug:** confirmed **fixed**. `src/pages/AnglesComparePage.css` forces `direction: ltr` on `.angles7-compare-row` and on `.angles7-scene[data-kind='compare'] .angles7-options`, with an explicit code comment explaining the original bug (DOM-first child rendering on the visual right under RTL, desyncing from the `question.answer` semantics). Verified live: a screenshot of the running preview server shows the `left` challenge data rendering on the visual left and `right` on the visual right, matching `<`/`=`/`>`.
- **No analogous bug found in Identify, Types, or Notation.** All of their option sets (`angles7-options`, `angles7-order-grid`) are genuinely unordered multiple-choice — there is no implied "this option must be on the left/right" semantic the way Compare's two named diagrams have — so even without a forced `direction`, a DOM-order/visual-order mismatch under RTL has no behavioral consequence. Checked `AnglesGrade7Shared.css` directly: no `direction` override is present or needed there, and this was visually confirmed in screenshots of Identify, Types, and Notation.
- **`GeometryStage` (`src/components/geometry/GeometryStage.tsx`) forces `direction: ltr` on every SVG stage itself** ("angle diagrams must never mirror under Hebrew RTL," per its own code comment) — this is the right general-purpose guard and was not found to be bypassed anywhere.
- **Minor, unconfirmed-as-a-bug observation:** in a screenshot of the Angle Notation activity, the ∠ glyph (U+2220) rendered visually similar to an upside-down question mark ("¿") in the headless-Chromium default font used by the Playwright run. This is most likely a font-fallback/glyph-coverage artifact of the specific test environment's font stack, not an app-code bug — `MathText.tsx` applies no font override, just `dir="ltr"`. Flagged as a low-priority, environment-dependent item worth a quick check on the actual target devices/browsers rather than a confirmed defect.
- **Minor inconsistency, not a correctness bug:** `AnglesIdentifyPage`'s `angle`-kind prompt renders the target name without the ∠ prefix (`"הקישו על הזווית הנקראת {{name}}."` + raw letters, e.g. "IAJ"), while every other angle-name display in the unit (Notation's options, Compare's labels) is wrapped in `∠` via `MathText`. Cosmetic/pedagogical-consistency note only.
- **No other mathematical correctness issues were found.** All 5 generators' own `assert*ChallengeIsSound` self-checks were exercised across many seeds by the existing test suite (all passing), and the live-generated sample set in §5 was manually spot-checked against its own stated answers with no disagreement found (e.g. Angle Types `order` correctly picked the true numeric max/min from a shuffled option list, not an option-order artifact; Compare Angles' answers matched simple numeric comparison of the two sides' true degree values in every sampled case).

---

## 9. Prioritized implementation backlog

Ordered by educational importance (not ease):

1. **Real-world/photographic reasoning activity** (Gap 1) — High importance, Medium complexity.
2. **Free-response "explain your reasoning" mechanism** (Gap 2) — High importance, Medium complexity (grading-model question is the hard part).
3. ~~**"Select all valid names" notation format** (Gap 5)~~ — **✅ done 2026-10-28** (see Gap 5 above); residual 4-name case left as an optional smaller follow-up.
4. **Angle-arithmetic/betweenness reasoning** (Gap 6, reusing `isRayBetween`) — Medium importance, Small–Medium complexity.
5. **Coordinate-grid bridging exercise** (Gap 4, reusing the existing but unused `GridLabeledPoint`) — Medium importance, Medium complexity.
6. **Reflex/"large" angle concept** (Gap 3) — Medium importance, Large complexity (shared-engine change, needs careful regression discipline since every other activity depends on `angleMath.ts`).
7. **Name-to-diagram matching format + applied word-problem format** (Gap 7) — Low–Medium importance, Small–Medium complexity.
8. **Cosmetic fixes** — add the ∠ prefix to Identify's `angle`-kind prompt for consistency; spot-check the ∠ glyph's rendering on real target browsers/devices.

> Also now done, outside this backlog's original scope (see §12): a digital-protractor "Measure an Angle" activity, built directly from the user's stated exam syllabus rather than from a gap this audit identified.

---

## 10. Conclusion

**Mostly ready, with specific gaps.**

The four skills the app does implement — angle-type classification, 3-letter notation with name-equivalence and Greek-letter shorthand, and ray-length-proof size comparison — are implemented with real mathematical rigor (shared engine, passing tests across difficulty tiers, live-verified sound generator output, a deliberately engineered and tested classification safety margin that exceeds what the textbook itself demands) and map cleanly onto the corresponding textbook material. A student who only needed to practice *those* specific skills would be well served.

It is **not** sufficient as a complete stand-alone substitute for exam prep against this specific textbook, because three cohesive blocks of material are absent rather than merely thin: all real-world/photographic reasoning, all free-response/explain-your-answer items, and a specific cluster of chapter-21/22 sub-topics (coordinate-plotting bridge, reflex angles, angle bisector, betweenness/angle-sum reasoning) whose supporting math primitives exist in the engine but are demonstrably never called by any current generator or page.

---

## 11. Remaining uncertainties and limitations

- **Visual verification was real, but limited in breadth.** Live screenshots were captured for one randomly-seeded instance of each of the 5 activities (not every difficulty tier, not every interaction `kind` within each activity) via a temporary Playwright spec that was deleted before finishing this audit. Deeper visual coverage (every `kind` × every difficulty × multiple random seeds, and on non-Chromium engines) was not performed.
- **The ∠-glyph rendering observation (§8) is environment-dependent** — it reflects headless Chromium's default font fallback on this machine, not necessarily what a real student would see on the app's actual target devices/browsers; this was explicitly not claimed as a confirmed bug.
- **The "equal angles marked identically" sidebar (ch. 20, p. 228) and Ex. 1(e)'s exact straight-angle configuration were evaluated by code/behavior inspection, not by constructing and manually solving an equivalent generated question by hand** — their matrix rows reflect structural/API-level evidence (e.g. `isRayBetween` being unused) rather than a literal attempt-and-compare.
- **No attempt was made to estimate exam point-weighting** for the statistics in §6 beyond the explicit disclaimer given there; the 30/42/27 split is a count of distinct textbook items, not a prediction of score impact.
- **The pre-existing Grade 3 "angles & triangles" unit** (`GeometryAnglesTrianglesPage.tsx`, `/grade/3/geometry-angles-triangles`) was identified and read far enough to confirm it is out of scope (different grade, different route, different underlying `AngleType`/`classifyAngle` types in `src/types/geometry.ts` vs. this unit's `AngleType7`), but was not itself audited for correctness — it is not part of this task's scope.
- **This audit did not modify, commit, or push anything.** `tsc -b`, `eslint`, `vitest`, and `playwright` were run read-only; a temporary `tsx` script and a temporary Playwright screenshot spec were both created in a scratch location / the `e2e/` folder respectively and deleted before finishing (confirmed via `git status --porcelain` returning empty immediately before writing this report). This report file itself is the one intentional addition to the working tree, left uncommitted as instructed.
- **§12 below was added after the fact (2026-10-28)** to record what's changed since this audit was originally written, without rewriting the historical findings above. The §3 matrix and §6 statistics are **not** recomputed to include it — treat §12 as "what's new since the audit," not as a correction to the audit itself.

---

## 12. Addendum (2026-10-28): what's changed since this audit

Two pieces of work landed on branch `feature/angles-select-names-and-measure` (commit `10edf68`, based on the `main`-merged state of this unit; not yet merged into `main`/`dev` as of this writing). Both were built from explicit user direction after reviewing this audit's findings, not autonomously.

### 12.1 — Gap 5 resolved: "select all valid names"

Covered inline in §3 (rows for p. 235 tip boxes (a)/(b) and p. 236 Ex. 6) and in §7's Gap 5 section above. Summary: `anglesNotationData.ts` gained a `selectAllNames` kind; `AnglesNotationPage.tsx` renders it as toggleable multi-select buttons with per-option correct/missed/invalid feedback on a wrong attempt. `allValidThreeLetterNames` and the previously-unused `canUseVertexOnlyName` are both now exercised. Verified live in a running dev build (not just via unit tests): a generated question on a 2-ray scene (vertex D, rays to F and I, with H as a third unrelated point) correctly offered 3 valid names (both letter-orderings of ∠FDH plus the vertex-only ∠D form) alongside plausible invalid distractors. Known, deliberate limitation: never offers a 4th correct name, since that specific configuration isn't constructible under the engine's current scene model (see Gap 5's resolution note in §7 for why).

### 12.2 — New activity: "Measure an Angle" (digital protractor)

**This is new content, not a textbook-matrix item** — the 7-page excerpt this audit was built against (chapters 20–22) does not contain a dedicated angle-measurement lesson; the audit's own §2 inventory and §3 matrix correctly show no "measure with a protractor" row because there isn't one in that source material. This activity was built because the user confirmed their child's actual exam syllabus separately names "measuring angles" as one of exactly three topics being tested (alongside identification/types and notation) — a direct instruction, not a gap this audit flagged.

**What it is:** a new reusable `Protractor` component (`src/components/geometry/Protractor.tsx`) — a purely presentational 180° arc with major ticks (every 10°, numbered) and minor ticks (every 2°) — composed into `VertexSceneView` via an optional `protractor` prop that aligns the protractor's own 0°/180° baseline to a scene's actual fixed reference ray (read from the same data the ray itself is drawn from, so the two can never drift apart). A new activity, `src/pages/AnglesMeasurePage.tsx` / `src/data/games/anglesMeasureData.ts`, draws one fixed ray and one measured ray, overlays the protractor baseline-aligned to the fixed ray (no free-dragging of the protractor itself — it's always correctly placed, matching how the skill is actually taught: read the number, don't fight the tool), and takes a numeric 0–180° answer graded with a per-difficulty tolerance (3°/3°/2°) chosen to be wider than by-eye reading error but narrower than the gap between adjacent 5°-step "nice" values at the basic tier, so no two neighboring readings can both be marked correct.

**Verification performed (reported by the agent that built it, spot-checked independently afterward):** full test suite (1591 tests) green, `tsc -b`/`eslint` clean, `npm run build` succeeds. The protractor's baseline-alignment correctness — the one property that actually matters here, given this unit's prior RTL-orientation bug in Compare Angles — was checked two ways: a fast DOM-based unit test (`Protractor.test.tsx`) rendering 7 different fixed-ray directions and asserting the rendered "0"/"180" tick positions match the ray's real drawn direction to within 1°, and a live Playwright run against a real built-and-previewed app reading actual `<line>`/tick coordinates the same way the original Compare Angles RTL bug was diagnosed. Independently re-verified in this follow-up pass: loaded the activity in a real browser, confirmed by eye that the protractor's numbers read left-to-right (not mirrored) on the Hebrew RTL page and that the dashed baseline visibly lines up with the fixed ray.

**Known limitations:** single-direction numbering only (a real protractor has inner and outer number rings for reading either direction; this one doesn't), no live degree readout while adjusting (intentional, to avoid leaking the answer), numeric-input answer rather than tap-on-the-scale (a deliberate simplicity choice, not a technical limitation).

**Not yet done:** this branch has not been pushed, merged into `main`/`dev`, or deployed as of this addendum.
