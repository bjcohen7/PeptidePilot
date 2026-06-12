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
  it("QUIZ_QUESTIONS has exactly 22 questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(22);
  });

  it("scoreMaps has exactly 22 entries", () => {
    expect(scoreMaps).toHaveLength(22);
  });

  it("each question has at least 2 options", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
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
    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    const results = calculateMatches(answers);
    expect(results).toHaveLength(12);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("calculateMatches returns matchPercent between 0 and 100", () => {
    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    const results = calculateMatches(answers);
    for (const r of results) {
      expect(r.matchPercent).toBeGreaterThanOrEqual(0);
      expect(r.matchPercent).toBeLessThanOrEqual(100);
    }
  });

  it("top match has matchPercent of 100", () => {
    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    const results = calculateMatches(answers);
    expect(results[0].matchPercent).toBe(100);
  });

  it("fat-loss answers boost metabolic peptides", () => {
    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    answers[0] = 0; // I want to lose weight
    answers[3] = 0; // food noise is always there
    answers[8] = 0; // "I eat past full"
    const results = calculateMatches(answers);
    const metabolicIds = ["semaglutide", "mots_c"];
    const topFive = results.slice(0, 5).map((r) => r.peptide.id);
    const hasMetabolicPeptide = topFive.some((id) => metabolicIds.includes(id));
    expect(hasMetabolicPeptide).toBe(true);
  });

  it("multi-select answers sum deltas across selected indices", () => {
    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    answers[13] = [0, 1, 3]; // Q14: calorie counting + keto + exercise
    const results = calculateMatches(answers);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("initAspects returns all zeros and excludes removed aspects", () => {
    const aspects = initAspects();
    for (const val of Object.values(aspects)) {
      expect(val).toBe(0);
    }
    expect((aspects as any).bmi_qualifies).toBeUndefined();
    expect((aspects as any).glp1_budget).toBeUndefined();
    expect((aspects as any).insurance).toBeUndefined();
  });
});

// ── Tier Determination Tests ───────────────────────────────────────────────────

describe("determineTier", () => {
  it("always returns tier 2", () => {
    const answers = new Array(QUIZ_QUESTIONS.length).fill(0);
    expect(determineTier(answers)).toBe(2);
  });

  it("returns 2 regardless of input", () => {
    for (let i = 0; i < 10; i++) {
      const answers = QUIZ_QUESTIONS.map((q) =>
        Math.floor(Math.random() * q.options.length),
      );
      expect(determineTier(answers)).toBe(2);
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
        answers: new Array(QUIZ_QUESTIONS.length).fill(0),
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
        answers: new Array(QUIZ_QUESTIONS.length).fill(0),
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
        answers: new Array(QUIZ_QUESTIONS.length - 1).fill(0),
      })
    ).rejects.toThrow();
  });

  it("succeeds with valid input and returns leadId and topMatches", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quiz.submitQuiz({
      email: "test@example.com",
      consentGiven: true,
      answers: new Array(QUIZ_QUESTIONS.length).fill(0),
    });

    expect(result.status).toBe("success");
    expect(typeof result.leadId).toBe("string");
    expect(result.leadId.length).toBeGreaterThan(0);
    expect(Array.isArray(result.topMatches)).toBe(true);
    expect(result.topMatches.length).toBeGreaterThan(0);
  });

  it("accepts multi-select answers in array format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const answers: (number | number[])[] = new Array(QUIZ_QUESTIONS.length).fill(0);
    answers[13] = [0, 1, 2]; // multi-select at Q14
    answers[15] = [0, 3];    // multi-select at Q16

    const result = await caller.quiz.submitQuiz({
      email: "test@example.com",
      consentGiven: true,
      answers,
    });

    expect(result.status).toBe("success");
  });
});
