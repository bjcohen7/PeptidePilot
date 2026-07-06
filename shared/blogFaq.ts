// FAQ data for blog posts that carry a visible FAQ section, used to emit
// FAQPage JSON-LD (must mirror the visible on-page FAQ). Currently the two
// GLP-1 beachhead posts (their FAQ is appended to contentHtml).
export const BLOG_FAQ: Record<string, Array<{ q: string; a: string }>> = {
  "tirzepatide-vs-retatrutide": [
    { q: "Can I buy retatrutide?", a: "No — it's investigational and not approved; it isn't legitimately available to consumers." },
    { q: "How is a triple agonist different from tirzepatide?", a: "Retatrutide adds glucagon-receptor activity to GIP/GLP-1; clinical significance is still being studied." },
    { q: "Is \"compounded retatrutide\" legal or safe?", a: "There is no FDA-approved retatrutide to compound from; treat such products as unverified and high-risk." },
    { q: "When might retatrutide be approved?", a: "Unknown — it depends on trial outcomes and FDA review; no approval date is set." },
    { q: "What does tirzepatide cost today?", a: "Brand Zepbound ~$1,086/mo list (or ~$299–$449/mo cash-pay via LillyDirect); compounded telehealth from ~$179/mo." },
  ],
  "aod-9604-vs-semaglutide": [
    { q: "Does AOD-9604 work for weight loss?", a: "Human evidence is weak and largely inconclusive; it is not an approved weight-loss treatment." },
    { q: "Is AOD-9604 FDA-approved?", a: "No." },
    { q: "How does its mechanism differ from semaglutide?", a: "AOD-9604 is an HGH fragment studied for fat metabolism; semaglutide is a GLP-1 receptor agonist that reduces appetite — different targets, very different evidence." },
    { q: "Is AOD-9604 safe?", a: "Its safety profile in humans is not well established; approach with caution and clinician input." },
    { q: "What does each cost?", a: "Semaglutide: ~$179/mo compounded telehealth to ~$1,349/mo brand; AOD-9604 has no standardized/approved pricing." },
  ],
};
