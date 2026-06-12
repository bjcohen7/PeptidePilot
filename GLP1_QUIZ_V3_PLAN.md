# GLP-1 Quiz v3 — Dev Plan

## Pre-build Findings & Open Questions

### 1. Score maps MUST be rewritten (flagging this)

The current `scoreMaps` array in `shared/scoring.ts` maps answer indices to aspect deltas for each question position. Since v3 changes ALL 22 questions (different content, different answer options, different positions), the `scoreMaps` array must be rewritten to match the new questions. The scoring ALGORITHM (dot product, normalization, peptide profile weights) stays untouched. The question-to-aspect mapping is content, not algorithm — but the brief says "don't touch the scoring engine." Need confirmation: is rewriting `scoreMaps` in scope, or is there an alternative approach?

### 2. QuizContext answer type needs to support multi-select

Current: `answers: (number | null)[]` — single index per question
v3 needs: Q14 (multi), Q16 (multi + none-of-these), Q17 (multi + off-ramp), Q20 (top-2)

Options:
- (a) Store first selected answer in main array, full selection in a sideband — keeps scoring compatible but loses data
- (b) Change type to `(number | number[] | null)[]` — requires updating QuizContext, submitQuiz, server validation, and calculateAspectScores to handle arrays at specific indices
- (c) Encode multi-select as bitmask in the single number field

Recommendation: (b) — proper type change. The scoring change is minimal (sum deltas for each selected index at multi-select positions).

### 3. GLP-1 branching (BMI + insurance) needs removal

Current: Q5 (BMI) and Q6 (Insurance) are conditional — only shown for weight-loss goal users, hidden otherwise. v3 has different questions at those positions. The branching logic in `QuizFlow.tsx` (lines 74-81) and all related code needs removal or replacement.

### 4. QUIZ_INDEX constants must be updated

Current constants reference old positions:
```
PRIMARY_GOAL: 0
GLP1_BMI: 5, GLP1_INSURANCE: 6
AGE_RANGE: 7, HORMONE: 8, LIBIDO: 9
BUDGET: 19
```

v3 positions are different. Constants need remapping to new question indices.

### 5. `determineTier` function references QUIZ_INDEX positions

Uses AGE_RANGE, HORMONE, LIBIDO, BUDGET constants. Since these questions change in v3 (different positions, different answer options), `determineTier` may need updating or removal. Currently determines lead value tiers for sales prioritization.

### 6. No `source` field on leads table

Leads schema has no `source` column. Need to add `varchar("source", { length: 64 })` via Drizzle migration for the off-ramp email capture flag (`source: 'glp1_offramp'`). One migration.

### 7. 4 interstitials to remove

Current breather sections in `QuizFlow.tsx`:
- "Metabolic Health" — remove
- "Age & Hormones" — remove
- "Cognition & Mood" — remove
- "Lifestyle & Preferences" — remove

The 5 v3 clusters (Hook, Symptom mapping, Personal context, Medical screening, Readiness) are invisible to users — NO interstitials between any of the 22 questions.

### 8. Section labels need updating

Current 8 sections with visible labels. v3 has 5 clusters that are architecture-only (invisible to users). Need to either:
- (a) Remove section labels entirely from question display
- (b) Map to new cluster names but hide them (per brief: no cluster headers visible)
- (c) Use generic labels like "Question X of 22"

### 9. Outdated test at `server/quiz.test.ts`

Asserts 10 questions. Needs updating for 22 questions with v3 content.

### 10. `getReturningResultsByToken` references quiz answers

In `server/routers/quiz.ts` — extracts `rawQuizData` from leads. Since answer format may change (multi-select), verify this still works.

---

## Files to Touch

| File | Action | Scope |
|---|---|---|
| `shared/scoring.ts` | Update QUIZ_QUESTIONS, QUIZ_INDEX, scoreMaps, determineTier, export constants | High |
| `client/src/pages/QuizFlow.tsx` | Update question rendering (quoted Q9, multi Q14/16/17, top-2 Q20), remove breathers, remove GLP-1 branching, update section labels, handle off-ramp routing | High |
| `client/src/contexts/QuizContext.tsx` | Update answer type to support multi-select | Medium |
| `client/src/components/bridge/ContraindicationOffRamp.tsx` | NEW — off-ramp screen for Q17 pregnancy/MTC | High |
| `server/routers/quiz.ts` | Update Zod validation for answer format, add source field handling, update getReturningResultsByToken | Medium |
| `drizzle/schema.ts` | Add `source` column to leads table | Low |
| `drizzle/` | Run `drizzle-kit generate` + `drizzle-kit migrate` for schema change | Low |
| `server/quiz.test.ts` | Update for v3 questions | Low |

## Not Touched

- `client/src/App.tsx` — routing unaffected
- `client/src/pages/Results.tsx` — results page logic unchanged
- `client/src/components/results/ResultsCommercePage.tsx` — unchanged
- `client/src/components/bridge/Glp1BridgePage.tsx` — unchanged
- `client/src/pages/Processing.tsx` — processing screen unchanged
- Peptide profile data — `peptideProfiles` array stays as-is
- Affiliate partner data — untouched
- Scoring algorithm — `calculateAspectScores()`, `calculateMatches()` stay same (only scoreMaps data changes)

## Open Questions (to confirm before coding)

1. **Score maps**: Can I rewrite `scoreMaps` to align with v3 questions? Or should I find a way to keep them as-is?
2. **Multi-select data model**: Option (b) — change answer type — OK? Or prefer a different approach?
3. **Section labels**: Remove entirely from UI, or keep some generic indicator?
4. **`determineTier`**: Keep, remove, or replace for GLP-1 focus?
5. **Q20 third-tap behavior**: My pref: brief visual pulse on the chip + remain at 2 selected (no swap). OK?
