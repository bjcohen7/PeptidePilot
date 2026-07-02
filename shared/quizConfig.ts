// Single source of truth for quiz size/duration copy across the whole site
// (homepage, meta/OG, pSEO CTAs, quiz interstitial). Derived from the actual
// quiz definition so copy can never drift from the real question set again.
//
// Historical drift this replaces: homepage said "20 questions / 5 minutes",
// the interstitial said "22 / 4". The real quiz is QUIZ_QUESTIONS.length.
import { QUIZ_QUESTIONS } from "./scoring";

/** Number of questions in the full (GLP-1) quiz — derived, never hardcoded. */
export const QUIZ_QUESTION_COUNT: number = QUIZ_QUESTIONS.length;

/**
 * Advertised completion time in minutes. Not derivable from the question count,
 * so it is declared here as the single source. 4 was chosen to match the quiz
 * interstitial, the email copy, and the /match landing CTA (the convergent
 * value across the newest surfaces); the stale homepage "5 minutes" is dropped.
 */
export const QUIZ_MINUTES = 4;

/** e.g. "22-question" — for inline prose. */
export const QUIZ_QUESTION_LABEL = `${QUIZ_QUESTION_COUNT}-question`;

/** e.g. "4-minute" — for inline prose / CTA buttons. */
export const QUIZ_MINUTES_LABEL = `${QUIZ_MINUTES}-minute`;
