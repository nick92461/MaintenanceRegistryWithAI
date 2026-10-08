# Intake assistant accuracy eval

Measures whether the AI intake assistant faithfully turns what a supervisor says into draft records.

## The standard

> The proposal from the LLM should match what the supervisor has in inventory, based on what the supervisor
> actually said. If the supervisor makes a mistake and it reaches the database, that is not an inaccuracy by
> the LLM. As long as the LLM faithfully proposed what the supervisor said he has, it is accurate.

Concretely, at the end of every supervisor message (a "checkpoint") each item mentioned must end up as one of:

| Key says | Accurate outcomes | Inaccurate outcomes |
|---|---|---|
| **draft** (derivable from what was said) | drafted with the right item, quantity, kind and location; or asked about instead | omitted, wrong quantity, wrong location, invented location, wrong kind (tool vs supply) where the kind is unambiguous, duplicate rows |
| **ask** (quantity, type or location genuinely unknown) | asked about (now or in an earlier reply); or a faithful alternative such as "3 boxes" recorded as boxes | a drafted record with a value the supervisor never gave ("fabricated"); silently dropped |
| **skip** (already saved, or a restock/usage of a saved item) | nothing drafted | a duplicate of the saved record |
| **absent** (retracted, hypothetical, not inventory) | nothing drafted | drafted anyway |

Any drafted row the key can't place counts as inaccurate until reviewed (see adjudication below).

Not graded: category names, reorder thresholds, and wording of names, as long as the name identifies the
right item. Asking an unnecessary question is not an inaccuracy; it is reported separately as the
**unnecessary question rate** (asks about derivable items, excluding items where asking is reasonable,
listed in `ASK_OK` in `scenarios.ts`).

## Design

- 101 scenarios, 114 checkpoints, 358 graded items per full pass (305 to draft, 19 to ask about, 26 already
  saved, 8 retracted or not inventory), across five supervisor styles
  (precise, casual, spoken/speech-to-text, terse, typos/non-native) and the confusions a supervisor naturally
  produces: package arithmetic, self-corrections, repeats, homophones, vague or ranged quantities, missing types,
  location carry-over, saved-record duplicates in other words, restocks the chat can't do, multi-turn
  corrections and partial answers, and long lists.
- Scenarios run against a realistic registry of 75 saved records (`registry.ts`) or an empty property.
- Each scenario runs 3 times (long lists 2) because the model is not deterministic. A scenario-run passes only
  if every checkpoint in it is accurate.
- The runner calls the app's real entry point, `sendAssistantMessage`: the real system prompt, tools, tool loop,
  ledger and `claude-sonnet-5`. Only login, the saved-record lookup and the demo message counter are stubbed.
  Scenarios under 1,500 characters run with the demo's settings (the live configuration); long lists run with
  the full app's settings.
- Every final draft table is then confirmed into a real database through `confirmDrafts`, read back, and
  compared field by field, so the result covers the records that actually get saved.

## How the key was protected from bias

1. The key was written before any chatbot run.
2. Free self-tests (`grade.selftest.eval.ts`): a perfect answer built from the key passes all 114 checkpoints,
   an empty answer fails every checkpoint that expects something, and seeded mistakes (wrong quantity, wrong
   location, extra tool, duplicate of a saved record, hallucinated row, guessed value, invented location) each fail.
3. A blind audit (`audit.eval.ts`): claude-opus-5-5 read every scenario without the key and said what should be
   drafted, asked or skipped. It agreed with every quantity and location in the key. Its judgment-call flags
   were resolved before the chatbot was tested (see `audit/audit-flags.json`).
4. The key was frozen (`key-freeze.json` holds the file hashes) before the pilot and the main run.

## Adjudication rules (written before any failure was seen)

A row or failure the automatic grader can't settle is reviewed by reading the transcript, using only these rules.
Every decision is recorded in `adjudications.json` with its reason, and the report counts them.

- **R1 Name variant.** If an unplaced row is clearly the same real-world item as an unfilled key item (same item
  and same location), it is assigned to that item and graded normally, including its quantity.
- **R2 Hallucination.** A row for something the supervisor never said they have stays inaccurate.
- **R3 Key error.** The key is corrected only if it is demonstrably wrong from the supervisor's words alone (an
  arithmetic slip, a misread message). Judgment calls are never changed after results are seen. Any correction is
  applied to every run and listed in the report.
- **R4 Wrong name.** A name that would not let a supervisor recognize the item, or names a different item
  ("drywall nails" for drywall screws, a garbled speech-to-text word copied verbatim), is inaccurate.

## Changes after the key was frozen

- **G1 (grader, not key):** during the run, one reply asked the supervisor to rephrase a cryptic message
  ("sh4 10 lvl 2ft, 5 spd sq") instead of guessing. The grader only recognized questions that named an item, so it
  scored this as an omission. A request to restate the whole message now counts as asking about every item in it.
  This only changes how that kind of reply is recognized; all stored transcripts were re-graded the same way.
  The key itself (`scenarios.ts`) was not changed after freezing. No adjudications were needed: no drafted row
  went unplaced.

## Results (2026-10-08, claude-sonnet-5)

See `run/summary.md` for every number, every inaccuracy and every unnecessary question, and `run/report.html`
for per-case transcripts.

- 300 of 300 planned runs scored (16 rate-limited attempts were retried; none are scored as failures).
- **297/300 runs fully accurate.** All 3 failures are the same item in every repeat of one scenario (B04): told
  "a new multimeter for shop 1", the assistant treated it as the saved Multimeter and skipped it (saying so).
- **0 inaccurate records** among the 1,589 records that were confirmed into the database (95% upper bound 0.19%).
  The B04 failure is a missing record, not a wrong one.
- Unnecessary questions: 23 of 821 derivable item checks (2.8%), in 16 of 300 runs.
- Same pass/fail verdict across repeats for 101/101 scenarios; identical final tables for 76/101.
- Disclosed borderline, not counted: in 2 of 3 runs of B12 ("two ladders"), the records were named "Step Ladder",
  a sub-type the supervisor didn't state.
- Total spend for the whole effort: $13.42 (audit $1.07, pilot $0.42, main run and retries $11.93).

## Running it

Paid runs need `ANTHROPIC_API_KEY` and the local database. `npm test` never runs these files.

```bash
npx vitest run --config eval/intake-accuracy/vitest.eval.config.mts eval/intake-accuracy/grade.selftest.eval.ts
```
```bash
EVAL_FLOW_DIR=eval/intake-accuracy/run EVAL_CAP_USD=20 npx vitest run --config eval/intake-accuracy/vitest.eval.config.mts eval/intake-accuracy/run.eval.ts
```
```bash
npx vitest run --config eval/intake-accuracy/vitest.eval.config.mts eval/intake-accuracy/analyze.eval.ts
```

`spend.json` tracks real spend from response token counts across every paid run.
