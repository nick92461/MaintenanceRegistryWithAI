# Intake assistant accuracy: results

Scored runs: **300** of 300 planned (0 app errors, 0 unresolved infra errors).

| Measure | Result |
|---|---|
| Runs with every checkpoint accurate | 297/300 (99.0%, 95% CI 97.1%-99.7%) |
| Inaccurate item checks | 3 of 976 (0 unplaced rows) |
| Inaccurate records in final tables | 0 of 1589 (95% upper bound 0.19%) |
| Unnecessary questions | 23 of 821 derivable item checks (2.8%) |
| Asked instead of drafting (incl. reasonable asks) | 33 |
| Same verdict across repeats | 101/101 scenarios |
| Identical final tables across repeats | 76/101 scenarios |
| Database round trip | 1589 saved, 0 refused by validation, 0 field mismatches |
| Chatbot cost | $11.77 (latency median 5.7s, p95 15.3s) |

## By supervisor style
| Style | Runs | Accurate runs | Item checks | Inaccurate |
|---|---|---|---|---|
| casual | 185 | 182/185 | 526 | 3 |
| precise | 39 | 39/39 | 144 | 0 |
| spoken | 32 | 32/32 | 127 | 0 |
| terse | 29 | 29/29 | 140 | 0 |
| typos | 15 | 15/15 | 39 | 0 |

## By confusion type
| Tag | Runs | Accurate runs | Item checks | Inaccurate |
|---|---|---|---|---|
| multi-turn | 36 | 36/36 | 111 | 0 |
| arithmetic | 27 | 27/27 | 57 | 0 |
| saved-duplicate | 26 | 26/26 | 112 | 0 |
| near-miss-item | 18 | 18/18 | 45 | 0 |
| self-correction | 17 | 17/17 | 94 | 0 |
| restock-out-of-scope | 17 | 17/17 | 88 | 0 |
| same-item-new-location | 15 | 15/15 | 27 | 0 |
| similar-items | 14 | 14/14 | 98 | 0 |
| multi-location | 13 | 13/13 | 207 | 0 |
| approximate | 12 | 12/12 | 30 | 0 |
| clean | 12 | 12/12 | 42 | 0 |
| misspelling | 12 | 12/12 | 30 | 0 |
| missing-pack-size | 12 | 12/12 | 24 | 0 |
| long-list | 12 | 12/12 | 310 | 0 |
| a-couple | 9 | 9/9 | 27 | 0 |
| retraction | 9 | 9/9 | 33 | 0 |
| question-mixed-in | 9 | 9/9 | 15 | 0 |
| number-words | 9 | 9/9 | 15 | 0 |
| reference-same | 9 | 9/9 | 27 | 0 |
| homophone | 6 | 6/6 | 15 | 0 |
| repeat-consistent | 6 | 6/6 | 12 | 0 |
| range | 6 | 6/6 | 12 | 0 |
| vague-quantity | 6 | 6/6 | 15 | 0 |
| abbreviation | 6 | 6/6 | 15 | 0 |
| saved-overlap-count | 6 | 6/6 | 9 | 0 |
| additional-tools | 6 | 3/6 | 9 | 3 |
| tools | 6 | 6/6 | 18 | 0 |
| usage-out-of-scope | 6 | 6/6 | 9 | 0 |
| not-inventory | 6 | 6/6 | 15 | 0 |
| missing-type | 6 | 6/6 | 6 | 0 |
| mixed-kinds | 6 | 6/6 | 18 | 0 |
| filler | 6 | 6/6 | 15 | 0 |
| different-count | 6 | 6/6 | 6 | 0 |
| notation | 6 | 6/6 | 12 | 0 |
| no-location | 6 | 6/6 | 9 | 0 |
| correction | 6 | 6/6 | 12 | 0 |
| demo-limit | 6 | 6/6 | 114 | 0 |
| repeat-additive | 3 | 3/3 | 3 | 0 |
| location-change | 3 | 3/3 | 12 | 0 |
| units | 3 | 3/3 | 6 | 0 |
| unresolved-conflict | 3 | 3/3 | 6 | 0 |
| tool-numbering | 3 | 3/3 | 9 | 0 |
| non-native | 3 | 3/3 | 9 | 0 |
| synonym | 3 | 3/3 | 6 | 0 |
| reworded | 3 | 3/3 | 9 | 0 |
| location-carry | 3 | 3/3 | 12 | 0 |
| slang | 3 | 3/3 | 6 | 0 |
| hedged-existence | 3 | 3/3 | 6 | 0 |
| implied-count | 3 | 3/3 | 9 | 0 |
| possible-saved-duplicate | 3 | 3/3 | 6 | 0 |
| answer-question | 3 | 3/3 | 6 | 0 |
| additive-update | 3 | 3/3 | 6 | 0 |
| move-location | 3 | 3/3 | 6 | 0 |
| partial-answers | 3 | 3/3 | 27 | 0 |

## Every inaccuracy
- **B04 rep 0 msg 1** multimeter: omitted - not drafted and not asked about
  - said: "We just bought 2 more impact drivers for shop 1 and a new multimeter for shop 1 too."
- **B04 rep 1 msg 1** multimeter: omitted - not drafted and not asked about
  - said: "We just bought 2 more impact drivers for shop 1 and a new multimeter for shop 1 too."
- **B04 rep 2 msg 1** multimeter: omitted - not drafted and not asked about
  - said: "We just bought 2 more impact drivers for shop 1 and a new multimeter for shop 1 too."


## Unnecessary questions
- A20 rep 0 msg 1 (grass-seed): 1. grass seed bags: How many pounds (or lbs) are in each bag of grass seed?
- B12 rep 0 msg 1 (buckets): 1. buckets: What size/type of buckets are these (e.g. 5-gallon plain buckets), and should they be tracked as a supply count of 4?
- B33 rep 0 msg 1 (2x4): 1. 2x4s: Are the "forty 2x4s" individual boards, and what length are they (e.g. 8ft)?
- B37 rep 0 msg 1 (levels): Could you rephrase it with the location and items you'd like to add?
- B37 rep 0 msg 1 (speed-squares): Could you rephrase it with the location and items you'd like to add?
- B46 rep 0 msg 1 (filters-20x20): 1. 20x20x1 and 16x25x1 Furnace Filters, Shop 4: These filters already exist under Boiler Room — is Shop 4 the same place, or do you want separate stock tracked at Shop 4?
- B46 rep 0 msg 1 (filters-16x25): 1. 20x20x1 and 16x25x1 Furnace Filters, Shop 4: These filters already exist under Boiler Room — is Shop 4 the same place, or do you want separate stock tracked at Shop 4?
- M01 rep 0 msg 2 (pvc-cement): 1. PVC cement: What size are the 6 cans of PVC cement (e.g. 8oz, quart)? / 8oz, quart, gallon)?
- D02 rep 0 msg 1 (aa): 1. AA batteries (clubhouse, 24): Shop 1 already has AA batteries on record - should these 24 be added there, or is the clubhouse a separate stock location to track on its own? / 2. light bulbs (60 watt), clubhouse: Are these standard incandescent/CFL 60-watt bulbs, and is there a color temperature (like soft white or daylight) I should note?
- D02 rep 0 msg 1 (bulbs): 1. AA batteries (clubhouse, 24): Shop 1 already has AA batteries on record - should these 24 be added there, or is the clubhouse a separate stock location to track on its own? / 2. light bulbs (60 watt), clubhouse: Are these standard incandescent/CFL 60-watt bulbs, and is there a color temperature (like soft white or daylight) I should note?
- A20 rep 1 msg 1 (grass-seed): 1. grass seed bags: How many pounds (or lbs per bag) is each bag of grass seed, so I can log total quantity correctly? / Want me to just log it as "15 bags"?
- B12 rep 1 msg 1 (buckets): 1. buckets: How many buckets, and what size/type (e.g. 5-gallon)?
- A04 rep 2 msg 1 (chlorine): 1. chlorine jugs: How many gallons/lbs per jug, so I can set a good reorder level?
- A20 rep 2 msg 1 (grass-seed): 1. grass seed bags: How many pounds (or lbs) per bag, so I can log total quantity correctly?
- B12 rep 2 msg 1 (buckets): 1. buckets: What size/type of buckets are these (e.g. 5-gallon utility buckets), and how many total?
- B33 rep 2 msg 1 (2x4): 1. 2x4s: Are the "forty" 2x4s individual boards, and what length are they (e.g. 8ft)?
- B37 rep 2 msg 1 (levels): Could you clarify what "sh4 10 lvl 2ft, 5 spd sq" refers to—what item(s) and location did you mean?
- B37 rep 2 msg 1 (speed-squares): Could you clarify what "sh4 10 lvl 2ft, 5 spd sq" refers to—what item(s) and location did you mean?
- B46 rep 2 msg 1 (filters-20x20): 1. 20x20x1 and 16x25x1 Furnace Filters (Shop 4): We already have these filter sizes stored under "Boiler Room" - is Shop 4 the same location renamed, a separate stock location, or did you mean to add to the existing Boiler Room stock? / Quick question: is "Shop 4" the same place as your existing "Boiler Room" filter stock, a different location entirely, or did you want these added to the existing stock there?
- B46 rep 2 msg 1 (filters-16x25): 1. 20x20x1 and 16x25x1 Furnace Filters (Shop 4): We already have these filter sizes stored under "Boiler Room" - is Shop 4 the same location renamed, a separate stock location, or did you mean to add to the existing Boiler Room stock? / Quick question: is "Shop 4" the same place as your existing "Boiler Room" filter stock, a different location entirely, or did you want these added to the existing stock there?
- M01 rep 2 msg 2 (pvc-cement): 1. PVC cement: What size are the 6 cans (e.g. quart, pint, half-pint)?
- B37 rep 1 msg 1 (levels): 1. sh4 10 lvl 2ft, 5 spd sq: Could you clarify this item? It looks like it may have been garbled by speech-to-text — what tool or supply did you mean?
- B37 rep 1 msg 1 (speed-squares): 1. sh4 10 lvl 2ft, 5 spd sq: Could you clarify this item? It looks like it may have been garbled by speech-to-text — what tool or supply did you mean?


## App errors (no draft produced, supervisor shown a message)
- none

## Adjudications
- none