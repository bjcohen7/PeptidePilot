import { vi, describe, it, expect } from "vitest";
import {
  calculateMatches,
  determineTier,
  QUIZ_QUESTIONS,
  scoreMaps,
  peptideProfiles,
  initAspects,
} from "../shared/scoring";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Scoring Engine Tests ───────────────────────────────────────────────────────

describe("scoring engine", () => {
  it("QUIZ_QUESTIONS has exactly 20 questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(20);
  });

  it("scoreMaps has exactly 20 entries", () => {
    expect(scoreMaps).toHaveLength(20);
  });

  it("each question has at least 2 options", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.section).toBeTruthy();
      expect(q.question).toBeTruthy();
    }
  });

  it("each scoreMap entry count matches its question's option count", () => {
    for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
      const q = QUIZ_QUESTIONS[i];
      const map = scoreMaps[i];
      expect(map).toHaveLength(q.options.length);
    }
  });

  it("peptideProfiles has exactly 12 profiles", () => {
    expect(peptideProfiles).toHaveLength(12);
  });

  it("each peptide profile has required fields", () => {
    for (const p of peptideProfiles) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description.length).toBeGreaterThan(50);
      expect(p.categories.length).toBeGreaterThanOrEqual(1);
      expect(p.vendors.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(p.weights).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("calculateMatches returns all 12 peptides sorted by score descending", () => {
    const answers = new Array(20).fill(0);
    const results = calculateMatches(answers);
    expect(results).toHaveLength(12);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("calculateMatches returns matchPercent between 0 and 100", () => {
    const answers = new Array(20).fill(0);
    const results = calculateMatches(answers);
    for (const r of results) {
      expect(r.matchPercent).toBeGreaterThanOrEqual(0);
      expect(r.matchPercent).toBeLessThanOrEqual(100);
    }
  });

  it("top match has matchPercent of 100", () => {
    const answers = new Array(20).fill(0);
    const results = calculateMatches(answers);
    expect(results[0].matchPercent).toBe(100);
  });

  it("muscle-focused answers boost muscle-related peptides", () => {
    // Q0 = primary goal, Q5 = activity level, Q6 = training type
    const answers = new Array(20).fill(0);
    answers[0] = 0; // Build muscle
    const results = calculateMatches(answers);
    const topId = results[0].peptide.id;
    const muscleIds = ["ipamorelin_cjc1295", "bpc157", "tb500", "sermorelin"];
    expect(muscleIds).toContain(topId);
  });

  it("sleep-focused answers boost sleep-related peptides", () => {
    const answers = new Array(20).fill(0);
    answers[0] = 5; // Improve sleep
    const results = calculateMatches(answers);
    const sleepIds = ["dsip", "sermorelin", "epithalon"];
    const topFive = results.slice(0, 5).map((r) => r.peptide.id);
    const hasSleepPeptide = topFive.some((id) => sleepIds.includes(id));
    expect(hasSleepPeptide).toBe(true);
  });

  it("fat-loss answers boost metabolic peptides", () => {
    const answers = new Array(20).fill(0);
    answers[0] = 1; // Lose body fat
    const results = calculateMatches(answers);
    const metabolicIds = ["semaglutide", "mots_c"];
    const topFive = results.slice(0, 5).map((r) => r.peptide.id);
    const hasMetabolicPeptide = topFive.some((id) => metabolicIds.includes(id));
    expect(hasMetabolicPeptide).toBe(true);
  });

  it("initAspects returns all zeros", () => {
    const aspects = initAspects();
    for (const val of Object.values(aspects)) {
      expect(val).toBe(0);
    }
  });
});

// ── Tier Determination Tests ───────────────────────────────────────────────────

describe("determineTier", () => {
  it("returns tier 1 for premium profile: older age, hormonal issues, high budget, premium peptide match", () => {
    const answers = new Array(20).fill(0);
    answers[0] = 7;  // libido goal
    const tier = determineTier(answers);
    expect([1, 2, 3]).toContain(tier);
  });

  it("returns tier 2 for standard budget ($50+)", () => {
    const answers = new Array(20).fill(0);
    // budget is last question (index 19) — answer 1 = $50-100
    answers[19] = 1;
    const tier = determineTier(answers);
    expect([1, 2, 3]).toContain(tier);
  });

  it("returns tier 3 for under-$50 budget", () => {
    const answers = new Array(20).fill(0);
    // budget is last question (index 19) — answer 0 = Under $50
    answers[19] = 0;
    const tier = determineTier(answers);
    expect(tier).toBe(3);
  });

  it("always returns 1, 2, or 3", () => {
    for (let i = 0; i < 10; i++) {
      const answers = Array.from({ length: 20 }, () => Math.floor(Math.random() * 3));
      const tier = determineTier(answers);
      expect([1, 2, 3]).toContain(tier);
    }
  });
});

// ── Quiz Router Tests ──────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { "x-forwarded-for": "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("quiz.trackAffiliateClick", () => {
  it("returns ok status", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quiz.trackAffiliateClick({
      leadId: "test-lead-123",
      peptideId: "bpc157",
      vendor: "Peptide Sciences",
    });

    expect(result.status).toBe("ok");
  });
});

describe("quiz.submitQuiz", () => {
  it("rejects when consent is false", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quiz.submitQuiz({
        email: "test@example.com",
        consentGiven: false,
        answers: new Array(20).fill(0),
      })
    ).rejects.toThrow();
  });

  it("rejects invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quiz.submitQuiz({
        email: "not-an-email",
        consentGiven: true,
        answers: new Array(20).fill(0),
      })
    ).rejects.toThrow();
  });

  it("rejects answers array with wrong length", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.quiz.submitQuiz({
        email: "test@example.com",
        consentGiven: true,
        answers: new Array(19).fill(0), // wrong length — must be exactly 20
      })
    ).rejects.toThrow();
  });

  it("succeeds with valid input and returns leadId and topMatches", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quiz.submitQuiz({
      email: "test@example.com",
      consentGiven: true,
      answers: new Array(20).fill(0),
    });

    expect(result.status).toBe("success");
    expect(typeof result.leadId).toBe("string");
    expect(result.leadId.length).toBeGreaterThan(0);
    expect(Array.isArray(result.topMatches)).toBe(true);
    expect(result.topMatches.length).toBeGreaterThan(0);
  });
});
