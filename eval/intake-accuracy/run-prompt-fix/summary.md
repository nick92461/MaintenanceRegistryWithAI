# Intake assistant accuracy: results

Scored runs: **30** of 300 planned (0 app errors, 0 unresolved infra errors).

| Measure | Result |
|---|---|
| Runs with every checkpoint accurate | 30/30 (100.0%, 95% CI 88.6%-100.0%) |
| Inaccurate item checks | 0 of 66 (0 unplaced rows) |
| Inaccurate records in final tables | 0 of 47 (95% upper bound 6.18%) |
| Unnecessary questions | 0 of 33 derivable item checks (0.0%) |
| Asked instead of drafting (incl. reasonable asks) | 8 |
| Same verdict across repeats | 10/10 scenarios |
| Identical final tables across repeats | 9/10 scenarios |
| Database round trip | 47 saved, 0 refused by validation, 0 field mismatches |
| Chatbot cost | $1.28 (latency median 6.5s, p95 8.6s) |

## By supervisor style
| Style | Runs | Accurate runs | Item checks | Inaccurate |
|---|---|---|---|---|
| casual | 24 | 24/24 | 48 | 0 |
| spoken | 3 | 3/3 | 9 | 0 |
| terse | 3 | 3/3 | 9 | 0 |

## By confusion type
| Tag | Runs | Accurate runs | Item checks | Inaccurate |
|---|---|---|---|---|
| saved-duplicate | 9 | 9/9 | 27 | 0 |
| restock-out-of-scope | 9 | 9/9 | 21 | 0 |
| near-miss-item | 9 | 9/9 | 21 | 0 |
| tools | 6 | 6/6 | 18 | 0 |
| saved-overlap-count | 6 | 6/6 | 9 | 0 |
| additional-tools | 3 | 3/3 | 6 | 0 |
| not-inventory | 3 | 3/3 | 6 | 0 |
| arithmetic | 3 | 3/3 | 6 | 0 |
| multi-turn | 3 | 3/3 | 6 | 0 |

## Every inaccuracy
- none

## Unnecessary questions
- none

## App errors (no draft produced, supervisor shown a message)
- none

## Adjudications
- none