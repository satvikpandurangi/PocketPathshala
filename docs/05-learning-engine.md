# Learning engine

Pure functions receive time and content explicitly. Defaults: pInit=.2, pTransit=.15, pSlip=.1, pGuess=.25, threshold=.75. For correct answers posterior = pL(1−s)/(pL(1−s)+(1−pL)g); wrong posterior = pL*s/(pL*s+(1−pL)(1−g)). Then pL'=posterior+(1−posterior)T. Parameters are validated; no rounding before decisions.

Skills in frontier order: PV2 (tens/ones), ADD_CARRY (prereq PV2), SUB_BORROW (prereq PV2), MUL_FACTS (prereq ADD_CARRY), DIV_SHARE (prereq MUL_FACTS). Division group label is “Ready for division”. Frontier is first unmastered eligible skill; all mastered falls back to mixed review. Config may override BKT per skill.

Selection priorities: pending scaffold after a tagged wrong answer; due mastered review; frontier; mixed practice. Difficulty: pL<.4 →1, <.65 →2, otherwise 3. Scaffold seeks a lower difficulty item with the same error tag; if impossible, retain same skill and explicitly use the easiest available. Never repeat the last item; avoid last ten where content allows. Replay-derived pending scaffold clears on the next attempt, allowing reconstruction after reload.

Initial mastery schedules +1 day, correct due review advances to +3 then +7 days; completed stage 3 continues +7-day reviews. Wrong due review resets to stage 0; below threshold clears mastery and review scheduling. DAY_MS is injected (real 86400000; demo 60000). Changing demo scale applies on replay and is intentionally a rehearsal feature.

Generation uses a seeded integer PRNG, no Math.random. 52 − 27 options are 25 correct, 35 SUB_NO_BORROW, 29 NEAR_MISS. Scaffold 43 − 18 has 35 wrong (no borrow), 25 correct, 21 near miss. Borrow-no-decrement for 41−17 is 34; no-borrow is 36. Collision rule: retain first tag then use distinct near-miss fallback. Carry omission 38+45=73; swapped place-value digits; adjacent multiplication fact; division multiplication confusion; generic off-by-ten/one.

Replay deduplicates UUIDs and sorts by normalized createdAt, deviceId, seq, id. Group by frontier across grades. “Needs you” takes precedence for three consecutive same-tag wrong attempts or >2 days inactivity among learners with activity. No-activity children remain in frontier groups. Cards report most common error tag and each child's grade. Unit tests must cover formulas, distractors, video flow, selection priority, clocks, deterministic replay and cross-grade grouping. BKT parameters are a transparent heuristic, not a clinically validated ability estimate.
