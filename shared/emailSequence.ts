/**
 * Email sequence configuration — all 11 slugs with Subject A/B variants.
 * Day offsets are relative to lead creation (email 0 = instant / next cron tick).
 */
export const EMAIL_SEQUENCE = [
  { slug: "email_0_instant", dayOffset: 0, subjectA: "Your GLP-1 match is ready", subjectB: "Your match: {{provider_name}} ({{match_score}}% fit)", weekendSlide: false },
  { slug: "email_1_why_match", dayOffset: 1, subjectA: "Why we matched you with {{provider_name}}", subjectB: "The 3 reasons behind your match", weekendSlide: true },
  { slug: "email_2_cost", dayOffset: 3, subjectA: "What GLP-1s actually cost (less than you think)", subjectB: "Brand-name vs. telehealth pricing, side by side", weekendSlide: false },
  { slug: "email_3_side_effects", dayOffset: 5, subjectA: "What the first month actually feels like", subjectB: "The side effects nobody explains properly", weekendSlide: true },
  { slug: "email_4_process", dayOffset: 7, subjectA: "What happens after you sign up (step by step)", subjectB: "From intake to first shipment: the timeline", weekendSlide: true },
  { slug: "email_5_alternatives", dayOffset: 10, subjectA: "Not sold on {{provider_name}}? Fair — here's your #2", subjectB: "Two other providers that fit your profile", weekendSlide: true },
  { slug: "email_6_closer", dayOffset: 14, subjectA: "Your match, one more time", subjectB: "Most people who match start within two weeks", weekendSlide: true },
] as const;

/**
 * Triggered emails — not part of the initial drip.
 */
export const TRIGGERED_EMAILS = {
  nudge_still_deciding: { slug: "nudge_still_deciding", subjectA: "Still weighing {{provider_name}}?", subjectB: "The three questions people ask before starting" },
  post_conversion: { slug: "post_conversion", subject: "You started — here's what the first month looks like" },
} as const;

/**
 * Backfill campaigns — injected at sequence position 1 for historical leads.
 */
export const BACKFILL_CAMPAIGNS = {
  backfill_a: { slug: "backfill_a", subjectA: "Your GLP-1 match is ready (in case you missed it)", subjectB: "Still here: your {{provider_name}} match" },
  backfill_b: { slug: "backfill_b", subjectA: "Since you took our quiz, a few things changed", subjectB: "Your GLP-1 match — updated pricing inside" },
  backfill_c: { slug: "backfill_c", subjectA: "We owe you your quiz results", subjectB: "You never got your results. That's on us." },
} as const;

export type EmailSlug = (typeof EMAIL_SEQUENCE)[number]["slug"];
export type TriggeredSlug = keyof typeof TRIGGERED_EMAILS;
export type BackfillSlug = keyof typeof BACKFILL_CAMPAIGNS;

/**
 * Send window config — emails 1-6 send 9:00-10:30am ET.
 * Weekend due dates slide to Monday, except email 2 (dayOffset=3).
 */
export const SEND_WINDOW = {
  startHour: 9,
  startMinute: 0,
  endHour: 10,
  endMinute: 30,
  timezone: "America/New_York",
} as const;

/**
 * Get all email slugs up to and including the given index.
 */
export function getEmailSlugsUpTo(maxIndex: number): EmailSlug[] {
  return EMAIL_SEQUENCE.slice(0, maxIndex + 1).map((e) => e.slug);
}

/**
 * Get the email slug at a given index.
 */
export function getEmailSlugAtIndex(index: number): EmailSlug | undefined {
  return EMAIL_SEQUENCE[index]?.slug;
}
