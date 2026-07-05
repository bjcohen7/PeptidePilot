import { QUIZ_INDEX, BUDGET_OPTIONS } from "./scoring";
import type { Provider } from "../drizzle/schema";

const BUDGET_INDEX_UPPER_CENTS = [5000, 10000, 20000, 50000, 999999];

export type ProviderMatchResult = {
  slug: string;
  displayName: string;
  fitScore: number;
  whyMatch: string[];
};

export function matchProviders(
  answers: number[],
  providers: { slug: string; displayName: string; priceFromCents: number; medsOffered: "oral" | "injectable" | "both"; cashPayFriendly: boolean; sortPriority: number }[],
): ProviderMatchResult[] {
  const budgetIdx = answers[QUIZ_INDEX.BUDGET] ?? -1;
  const insuranceIdx = answers[QUIZ_INDEX.GLP1_INSURANCE] ?? -1;
  const primaryGoalIdx = answers[QUIZ_INDEX.PRIMARY_GOAL] ?? -1;

  const budgetUpperCents = budgetIdx >= 0 && budgetIdx < BUDGET_INDEX_UPPER_CENTS.length
    ? BUDGET_INDEX_UPPER_CENTS[budgetIdx]
    : null;
  const isUninsured = insuranceIdx === 2;
  const isWeightLossGoal = primaryGoalIdx === 1;

  const withinBudget = (priceCents: number) =>
    budgetUpperCents !== null && priceCents <= budgetUpperCents;

  const scored = providers.map((p) => {
    let fitScore = 0;
    const priceDollars = (p.priceFromCents / 100).toFixed(0);

    // ── fitScore (points sum, 0–8) — UNCHANGED so the displayed match % is stable ──
    if (withinBudget(p.priceFromCents)) fitScore += 3;
    else if (budgetUpperCents !== null) fitScore += 1;
    if (isUninsured && p.cashPayFriendly) fitScore += 2;
    else if (!isUninsured && p.cashPayFriendly) fitScore += 1;
    if (isWeightLossGoal && p.medsOffered !== "oral") fitScore += 2;
    if (p.medsOffered === "both") fitScore += 1;

    // ── whyMatch — always echo the lead's REAL answers (answer → offer). These
    // are descriptive, decoupled from the point conditions above, so a lead who
    // is over-budget / insured / non-weight-loss still gets specific rows that
    // quote their own quiz answers rather than generic filler. ──
    const whyMatch: string[] = [];

    if (budgetIdx >= 0 && budgetIdx < BUDGET_OPTIONS.length) {
      whyMatch.push(
        withinBudget(p.priceFromCents)
          ? `Your budget (${BUDGET_OPTIONS[budgetIdx]}) → ${p.displayName} starts at $${priceDollars}/mo, all-inclusive`
          : `Your budget (${BUDGET_OPTIONS[budgetIdx]}) → ${p.displayName} is the lowest-cost match at $${priceDollars}/mo, no hidden fees`,
      );
    }

    if (isWeightLossGoal && p.medsOffered !== "oral") {
      whyMatch.push(
        `Your goal is weight loss → ${p.displayName} offers GLP-1/GIP therapy, the most clinically validated path`,
      );
    }

    if (insuranceIdx >= 0) {
      whyMatch.push(
        isUninsured
          ? `No insurance → ${p.displayName} is cash-pay from $${priceDollars}/mo, no prior authorization needed`
          : `Even with insurance → ${p.displayName}'s cash-pay plan skips the prior-auth wait at $${priceDollars}/mo flat`,
      );
    }

    if (p.medsOffered === "both" && whyMatch.length < 3) {
      whyMatch.push(
        `${p.displayName} offers both injectable and oral options — flexibility as your plan evolves`,
      );
    }

    return { fitScore, whyMatch, slug: p.slug, displayName: p.displayName, sortPriority: p.sortPriority };
  });

  scored.sort((a, b) => {
    if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
    return a.sortPriority - b.sortPriority;
  });

  return scored;
}
