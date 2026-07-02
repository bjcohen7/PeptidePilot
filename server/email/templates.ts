import { generateUnsubscribeToken } from "./schema";
import { getPhysicalAddress } from "./resend";
import { ENV } from "../_core/env";

/**
 * Full personalization for email templates.
 * All merge fields from email-copy.md.
 */
export type EmailPersonalization = {
  leadId: string;
  publicId: string;
  providerName: string;
  matchScore: number;
  priceFrom: string;
  shipDays: number;
  answerEcho: string;
  whyRow1: string;
  whyRow2: string;
  whyRow3: string;
  resultsUrl: string;
  goUrl: string;
  alt1Name: string;
  alt1Differentiator: string;
  alt2Name: string;
  alt2Differentiator: string;
  promoCode: string | null;
  complianceNote: string;
  mailingAddress: string;
};

function getSiteUrl(): string {
  // Canonical, always-https+www base for every email link (results, go, unsubscribe, logo).
  return ENV.appBaseUrl;
}

function getUnsubUrl(leadId: string): string {
  const token = generateUnsubscribeToken(leadId);
  return `${getSiteUrl()}/api/email/unsubscribe?token=${token}`;
}

function renderFooter(p: EmailPersonalization): string {
  const unsubUrl = getUnsubUrl(p.leadId);
  const showCompounded = p.complianceNote?.includes("compounded") || p.complianceNote?.includes("Compounded");
  return `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.5;">
      <p style="margin:0 0 8px;">PeptidePilot is an independent matching and comparison service. We earn a commission when you start treatment through our links. Not medical advice.</p>
      ${showCompounded ? `<p style="margin:0 0 8px;">Compounded medications are not FDA-approved finished drug products.</p>` : ""}
      <p style="margin:0 0 8px;">PeptidePilot &middot; ${p.mailingAddress} &middot; <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe (one-click)</a></p>
    </div>`;
}

/**
 * Render the match-score compatibility clause, or "" when the score is falsy.
 * Mirrors the answer_echo drop: a 0/null/undefined score drops the entire
 * clause (connector + "N% compatibility" + suffix) so zero never renders.
 */
function compatClause(p: EmailPersonalization, prefix: string, suffix: string): string {
  return p.matchScore ? `${prefix}${p.matchScore}% compatibility${suffix}` : "";
}

function layout(content: string, p: EmailPersonalization, preheader: string): string {
  const siteUrl = getSiteUrl();
  const unsubUrl = getUnsubUrl(p.leadId);

  // Invisible padding pushes body/logo text out of the inbox snippet so the
  // preheader is what the client previews.
  const preheaderPad = "&#847;&zwnj;&nbsp;".repeat(30);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>PeptidePilot</title>
  <style>
    body { margin:0; padding:0; background-color:#f8f9fa; color:#1a1a2e; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    .container { max-width:600px; margin:0 auto; background-color:#ffffff; }
    .header { padding:24px 32px; border-bottom:1px solid #e9ecef; }
    .logo { font-size:20px; font-weight:700; color:#1a1a2e; text-decoration:none; letter-spacing:-0.02em; }
    .body { padding:32px; }
    .body p { font-size:15px; line-height:1.6; margin:0 0 16px; color:#4a4a6a; }
    .body strong { color:#1a1a2e; }
    .cta { display:inline-block; padding:14px 28px; background-color:#0d9488; color:#ffffff !important; text-decoration:none; border-radius:8px; font-weight:600; font-size:15px; margin:8px 0 16px; }
    .cta:hover { background-color:#0f766e; }
    .footer { padding:24px 32px; background-color:#f8f9fa; }
    @media (prefers-color-scheme:dark) {
      body { background-color:#111827 !important; color:#e5e7eb !important; }
      .container { background-color:#1f2937 !important; }
      .header { border-bottom-color:#374151 !important; }
      .logo { color:#f9fafb !important; }
      .body p { color:#d1d5db !important; }
      .body strong { color:#f9fafb !important; }
      .footer { background-color:#111827 !important; }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:transparent;">${preheader}${preheaderPad}</div>
  <div class="container">
    <div class="header">
      <a href="${siteUrl}" class="logo">PeptidePilot</a>
    </div>
    <div class="body">
      ${content}
      ${renderFooter(p)}
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// EMAIL 0 — Instant
// ─────────────────────────────────────────────
export function email0(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Based on your answers — saved at your personal link.";
  if (variant === "B") {
    return {
      subject: p.matchScore ? `Your match: ${p.providerName} (${p.matchScore}% fit)` : `Your match: ${p.providerName}`,
      preheader,
      html: layout(`
<p>Your results are in.</p>
<p>Based on your answers, your top match is <strong>${p.providerName}</strong>${compatClause(p, " — ", "")}. ${p.answerEcho}</p>
<p>Your full breakdown — why it fits, what it costs, and two alternatives — is saved at your personal link:</p>
<p><a href="${p.resultsUrl}" class="cta">View my results →</a></p>
<p>This link is yours; it works on any device, anytime.</p>
`, p, preheader),
    };
  }
  // Subject A
  return {
    subject: "Your GLP-1 match is ready",
    preheader,
    html: layout(`
<p>Your results are in.</p>
<p>Based on your answers, your top match is <strong>${p.providerName}</strong>${compatClause(p, " — ", "")}. ${p.answerEcho}</p>
<p>Your full breakdown — why it fits, what it costs, and two alternatives — is saved at your personal link:</p>
<p><a href="${p.resultsUrl}" class="cta">View my results →</a></p>
<p>This link is yours; it works on any device, anytime.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 1 — Day 1: Why match
// ─────────────────────────────────────────────
export function email1(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Your answers → their offer, line by line.";
  if (variant === "B") {
    return {
      subject: "The 3 reasons behind your match",
      preheader,
      html: layout(`
<p>Quick follow-up on your match. We don't do generic recommendations, so here's the actual reasoning — your answers on the left, what ${p.providerName} offers on the right:</p>
<p><strong>${p.whyRow1}</strong></p>
<p><strong>${p.whyRow2}</strong></p>
<p><strong>${p.whyRow3}</strong></p>
<p>One more thing worth knowing: we ranked them against every provider in our network, and nobody pays us for placement. The match is the match.</p>
<p><a href="${p.resultsUrl}" class="cta">See my full breakdown →</a></p>
`, p, preheader),
    };
  }
  return {
    subject: `Why we matched you with ${p.providerName}`,
    preheader,
    html: layout(`
<p>Quick follow-up on your match. We don't do generic recommendations, so here's the actual reasoning — your answers on the left, what ${p.providerName} offers on the right:</p>
<p><strong>${p.whyRow1}</strong></p>
<p><strong>${p.whyRow2}</strong></p>
<p><strong>${p.whyRow3}</strong></p>
<p>One more thing worth knowing: we ranked them against every provider in our network, and nobody pays us for placement. The match is the match.</p>
<p><a href="${p.resultsUrl}" class="cta">See my full breakdown →</a></p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 2 — Day 3: Cost
// ─────────────────────────────────────────────
export function email2(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "The math nobody lays out plainly.";
  if (variant === "B") {
    return {
      subject: "Brand-name vs. telehealth pricing, side by side",
      preheader,
      html: layout(`
<p>The number one reason people stall on GLP-1s is the price they think they'll pay — usually the brand-name pharmacy price, which often lists well over $1,000 a month without insurance coverage.</p>
<p>That's not the price you were matched with. Telehealth providers prescribing compounded GLP-1 medications work differently: one monthly subscription that covers the medication, the provider visits, and ongoing support. Your match, ${p.providerName}, starts at <strong>${p.priceFrom}/month</strong> — no insurance involved at all.</p>
<p>Worth knowing as you compare: compounded medications are not FDA-approved finished drug products; they're prepared by licensed pharmacies to a provider's prescription. Your provider walks through this during intake.</p>
<p><a href="${p.resultsUrl}" class="cta">See my plan's pricing →</a></p>
<p style="font-size:13px;color:#6b7280;">P.S. Prices in your results update when providers change theirs — the link always shows current numbers.</p>
`, p, preheader),
    };
  }
  return {
    subject: "What GLP-1s actually cost (less than you think)",
    preheader,
    html: layout(`
<p>The number one reason people stall on GLP-1s is the price they think they'll pay — usually the brand-name pharmacy price, which often lists well over $1,000 a month without insurance coverage.</p>
<p>That's not the price you were matched with. Telehealth providers prescribing compounded GLP-1 medications work differently: one monthly subscription that covers the medication, the provider visits, and ongoing support. Your match, ${p.providerName}, starts at <strong>${p.priceFrom}/month</strong> — no insurance involved at all.</p>
<p>Worth knowing as you compare: compounded medications are not FDA-approved finished drug products; they're prepared by licensed pharmacies to a provider's prescription. Your provider walks through this during intake.</p>
<p><a href="${p.resultsUrl}" class="cta">See my plan's pricing →</a></p>
<p style="font-size:13px;color:#6b7280;">P.S. Prices in your results update when providers change theirs — the link always shows current numbers.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 3 — Day 5: Side effects
// ─────────────────────────────────────────────
export function email3(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Honest answer: some nausea, and here's why it fades.";
  if (variant === "B") {
    return {
      subject: "The side effects nobody explains properly",
      preheader,
      html: layout(`
<p>Nobody selling GLP-1s wants to talk about this part, so we will.</p>
<p>The most common early side effects are nausea, and sometimes constipation or fatigue, mostly in the first few weeks. This is well documented in the published research — it happens because the medication slows digestion, which is also part of how it reduces appetite.</p>
<p>Two things make it manageable. First, providers start at a low dose and increase it gradually ("titration"), specifically so your body adjusts. Second, most people find the effects fade as weeks pass — and your provider can slow the schedule if they don't. Eating smaller meals and going easy on greasy food in week one helps more than people expect.</p>
<p>If side effects are the thing making you hesitate, that's a good instinct — it means you're taking the decision seriously. It's also exactly the conversation to have with a licensed provider, which is what the intake is for.</p>
<p style="font-size:13px;color:#6b7280;">P.S. Your match and full details are saved here whenever you're ready: <a href="${p.resultsUrl}" style="color:#6b7280;text-decoration:underline;">${p.resultsUrl}</a></p>
`, p, preheader),
    };
  }
  return {
    subject: "What the first month actually feels like",
    preheader,
    html: layout(`
<p>Nobody selling GLP-1s wants to talk about this part, so we will.</p>
<p>The most common early side effects are nausea, and sometimes constipation or fatigue, mostly in the first few weeks. This is well documented in the published research — it happens because the medication slows digestion, which is also part of how it reduces appetite.</p>
<p>Two things make it manageable. First, providers start at a low dose and increase it gradually ("titration"), specifically so your body adjusts. Second, most people find the effects fade as weeks pass — and your provider can slow the schedule if they don't. Eating smaller meals and going easy on greasy food in week one helps more than people expect.</p>
<p>If side effects are the thing making you hesitate, that's a good instinct — it means you're taking the decision seriously. It's also exactly the conversation to have with a licensed provider, which is what the intake is for.</p>
<p style="font-size:13px;color:#6b7280;">P.S. Your match and full details are saved here whenever you're ready: <a href="${p.resultsUrl}" style="color:#6b7280;text-decoration:underline;">${p.resultsUrl}</a></p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 4 — Day 7: Process
// ─────────────────────────────────────────────
export function email4(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Three steps, no waiting rooms.";
  if (variant === "B") {
    return {
      subject: "From intake to first shipment: the timeline",
      preheader,
      html: layout(`
<p>If you've never used a telehealth provider, the process is the unknown that stalls people. Here's exactly what happens with ${p.providerName}:</p>
<p><strong>1.</strong> You complete a ~10-minute online intake — health history, goals, current medications.</p>
<p><strong>2.</strong> A licensed provider reviews it, typically within 24–48 hours. Prescriptions are only issued when the provider decides treatment is medically appropriate — nothing is automatic.</p>
<p><strong>3.</strong> If approved, medication ships to your door, usually within about ${p.shipDays} days, with provider messaging available as you go.</p>
<p><a href="${p.goUrl}" class="cta">Start my 10-minute intake →</a></p>
<p>No waiting rooms, no insurance paperwork, cancel anytime.</p>
`, p, preheader),
    };
  }
  return {
    subject: "What happens after you sign up (step by step)",
    preheader,
    html: layout(`
<p>If you've never used a telehealth provider, the process is the unknown that stalls people. Here's exactly what happens with ${p.providerName}:</p>
<p><strong>1.</strong> You complete a ~10-minute online intake — health history, goals, current medications.</p>
<p><strong>2.</strong> A licensed provider reviews it, typically within 24–48 hours. Prescriptions are only issued when the provider decides treatment is medically appropriate — nothing is automatic.</p>
<p><strong>3.</strong> If approved, medication ships to your door, usually within about ${p.shipDays} days, with provider messaging available as you go.</p>
<p><a href="${p.goUrl}" class="cta">Start my 10-minute intake →</a></p>
<p>No waiting rooms, no insurance paperwork, cancel anytime.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 5 — Day 10: Alternatives
// ─────────────────────────────────────────────
export function email5(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Your match was a ranking, not a verdict.";
  if (variant === "B") {
    return {
      subject: "Two other providers that fit your profile",
      preheader,
      html: layout(`
<p>Your top match was a ranking, not an ultimatum. If something about ${p.providerName} hasn't clicked, these also scored well for your profile:</p>
<p><strong>${p.alt1Name}</strong> — ${p.alt1Differentiator}</p>
<p><strong>${p.alt2Name}</strong> — ${p.alt2Differentiator}</p>
<p>The honest guidance: all of these connect you to licensed US providers and none requires insurance. The differences are price structure, medication formats, and pace — which is exactly what the one-line notes above capture.</p>
<p><a href="${p.resultsUrl}" class="cta">Compare my matches →</a></p>
`, p, preheader),
    };
  }
  return {
    subject: `Not sold on ${p.providerName}? Fair — here's your #2`,
    preheader,
    html: layout(`
<p>Your top match was a ranking, not an ultimatum. If something about ${p.providerName} hasn't clicked, these also scored well for your profile:</p>
<p><strong>${p.alt1Name}</strong> — ${p.alt1Differentiator}</p>
<p><strong>${p.alt2Name}</strong> — ${p.alt2Differentiator}</p>
<p>The honest guidance: all of these connect you to licensed US providers and none requires insurance. The differences are price structure, medication formats, and pace — which is exactly what the one-line notes above capture.</p>
<p><a href="${p.resultsUrl}" class="cta">Compare my matches →</a></p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// EMAIL 6 — Day 14: Closer
// ─────────────────────────────────────────────
export function email6(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Last one from us on this — the link's below.";
  const promoBlock = p.promoCode
    ? `<p>Through our partnership, code <strong>${p.promoCode}</strong> applies at signup.</p>`
    : "";
  if (variant === "B") {
    return {
      subject: "Most people who match start within two weeks",
      preheader,
      html: layout(`
<p>Two weeks ago you asked us which GLP-1 provider fits you. The answer hasn't changed: <strong>${p.providerName}</strong>, from ${p.priceFrom}/month${compatClause(p, ", ", " with your profile")}.</p>
${promoBlock}
<p>This is the last email in this series — we don't believe in drip campaigns that never end. Your results stay saved at your link, and we'll only reach out monthly with pricing changes and research updates.</p>
<p><a href="${p.goUrl}" class="cta">Claim my match at ${p.providerName} →</a></p>
<p>Deciding it's not for you is also a fine outcome — that's what an honest match service looks like.</p>
`, p, preheader),
    };
  }
  return {
    subject: "Your match, one more time",
    preheader,
    html: layout(`
<p>Two weeks ago you asked us which GLP-1 provider fits you. The answer hasn't changed: <strong>${p.providerName}</strong>, from ${p.priceFrom}/month${compatClause(p, ", ", " with your profile")}.</p>
${promoBlock}
<p>This is the last email in this series — we don't believe in drip campaigns that never end. Your results stay saved at your link, and we'll only reach out monthly with pricing changes and research updates.</p>
<p><a href="${p.goUrl}" class="cta">Claim my match at ${p.providerName} →</a></p>
<p>Deciding it's not for you is also a fine outcome — that's what an honest match service looks like.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// NUDGE — Affiliate click + 3 days, no conversion
// ─────────────────────────────────────────────
export function emailNudge(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Cost, commitment, and what if it's not for you.";
  if (variant === "B") {
    return {
      subject: "The three questions people ask before starting",
      preheader,
      html: layout(`
<p>You took a look at ${p.providerName} a few days ago — which usually means you're weighing it. The three questions people are weighing at this exact point:</p>
<p><strong>"Can I afford it monthly?"</strong> Plans start at ${p.priceFrom}/month, all-in — medication, provider visits, support. No insurance, no surprise line items.</p>
<p><strong>"Am I locked in?"</strong> You can cancel your subscription.</p>
<p><strong>"What if the provider says no?"</strong> Then you don't pay for treatment. Prescriptions only happen when a licensed provider decides it's appropriate.</p>
<p><a href="${p.goUrl}" class="cta">Pick up where I left off →</a></p>
`, p, preheader),
    };
  }
  return {
    subject: `Still weighing ${p.providerName}?`,
    preheader,
    html: layout(`
<p>You took a look at ${p.providerName} a few days ago — which usually means you're weighing it. The three questions people are weighing at this exact point:</p>
<p><strong>"Can I afford it monthly?"</strong> Plans start at ${p.priceFrom}/month, all-in — medication, provider visits, support. No insurance, no surprise line items.</p>
<p><strong>"Am I locked in?"</strong> You can cancel your subscription.</p>
<p><strong>"What if the provider says no?"</strong> Then you don't pay for treatment. Prescriptions only happen when a licensed provider decides it's appropriate.</p>
<p><a href="${p.goUrl}" class="cta">Pick up where I left off →</a></p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// POST-CONVERSION
// ─────────────────────────────────────────────
export function emailPostConversion(p: EmailPersonalization): { subject: string; preheader: string; html: string } {
  return {
    subject: "You started — here's what the first month looks like",
    preheader: "Week-by-week, from someone with no stake in sugarcoating it.",
    html: layout(`
<p>Congrats on starting with ${p.providerName}. Since we're not the ones treating you, here's the no-stake version of what the first month usually looks like: weeks 1–2 are the adjustment window (smaller appetite, possibly some nausea — normal, and your provider can adjust dosing), and most people describe weeks 3–4 as when it settles in.</p>
<p>One practical tip: message your provider early and often — async messaging is included and it's the most under-used part of these programs.</p>
<p>We'll leave you alone now except for the monthly research update. Good luck — genuinely.</p>
`, p, "Week-by-week, from someone with no stake in sugarcoating it."),
  };
}

// ─────────────────────────────────────────────
// BACKFILL A — leads ≤30 days
// ─────────────────────────────────────────────
export function emailBackfillA(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Saved and waiting at your personal link.";
  if (variant === "B") {
    return {
      subject: `Still here: your ${p.providerName} match`,
      preheader,
      html: layout(`
<p>You took our GLP-1 matching quiz recently — and in case the results never reached you properly, here they are again.</p>
<p>Your top match: <strong>${p.providerName}</strong>${compatClause(p, ", ", "")}. ${p.answerEcho}</p>
<p><a href="${p.resultsUrl}" class="cta">View my results →</a></p>
`, p, preheader),
    };
  }
  return {
    subject: "Your GLP-1 match is ready (in case you missed it)",
    preheader,
    html: layout(`
<p>You took our GLP-1 matching quiz recently — and in case the results never reached you properly, here they are again.</p>
<p>Your top match: <strong>${p.providerName}</strong>${compatClause(p, ", ", "")}. ${p.answerEcho}</p>
<p><a href="${p.resultsUrl}" class="cta">View my results →</a></p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// BACKFILL B — leads 31–90 days
// ─────────────────────────────────────────────
export function emailBackfillB(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Provider pricing moves fast. Your results moved with it.";
  const networkFloor = p.priceFrom;
  if (variant === "B") {
    return {
      subject: "Your GLP-1 match — updated pricing inside",
      preheader,
      html: layout(`
<p>A little while back you took our quiz to find the right GLP-1 provider. Two things have changed since:</p>
<p><strong>Pricing moved.</strong> Telehealth GLP-1 pricing has been shifting — plans in our network now start as low as ${networkFloor}/month. Your saved results always show current numbers.</p>
<p><strong>Your results page got better.</strong> It now shows exactly why you matched, what's included at each price, and what happens after signup — the stuff we should have shown you the first time.</p>
<p><a href="${p.resultsUrl}" class="cta">See my updated match →</a></p>
<p style="font-size:13px;color:#6b7280;">P.S. If your situation's changed, you can retake the quiz in 4 minutes and we'll re-match you.</p>
`, p, preheader),
    };
  }
  return {
    subject: "Since you took our quiz, a few things changed",
    preheader,
    html: layout(`
<p>A little while back you took our quiz to find the right GLP-1 provider. Two things have changed since:</p>
<p><strong>Pricing moved.</strong> Telehealth GLP-1 pricing has been shifting — plans in our network now start as low as ${networkFloor}/month. Your saved results always show current numbers.</p>
<p><strong>Your results page got better.</strong> It now shows exactly why you matched, what's included at each price, and what happens after signup — the stuff we should have shown you the first time.</p>
<p><a href="${p.resultsUrl}" class="cta">See my updated match →</a></p>
<p style="font-size:13px;color:#6b7280;">P.S. If your situation's changed, you can retake the quiz in 4 minutes and we'll re-match you.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// BACKFILL C — leads 90+ days
// ─────────────────────────────────────────────
export function emailBackfillC(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "Fixed now — here's your match.";
  if (variant === "B") {
    return {
      subject: "You never got your results. That's on us.",
      preheader,
      html: layout(`
<p>Some time ago you took our GLP-1 matching quiz and gave us your email — and because of a technical issue on our side, there's a good chance you never actually saw your results. That's on us, and it's fixed.</p>
<p>Here's what you were owed: your top match is <strong>${p.providerName}</strong>${compatClause(p, " (", " for your profile)")}, with two ranked alternatives, current pricing, and the full reasoning — all saved at your personal link:</p>
<p><a href="${p.resultsUrl}" class="cta">See my results →</a></p>
<p>If GLP-1s are no longer on your radar, the unsubscribe below works in one click — no hard feelings.</p>
`, p, preheader),
    };
  }
  return {
    subject: "We owe you your quiz results",
    preheader,
    html: layout(`
<p>Some time ago you took our GLP-1 matching quiz and gave us your email — and because of a technical issue on our side, there's a good chance you never actually saw your results. That's on us, and it's fixed.</p>
<p>Here's what you were owed: your top match is <strong>${p.providerName}</strong>${compatClause(p, " (", " for your profile)")}, with two ranked alternatives, current pricing, and the full reasoning — all saved at your personal link:</p>
<p><a href="${p.resultsUrl}" class="cta">See my results →</a></p>
<p>If GLP-1s are no longer on your radar, the unsubscribe below works in one click — no hard feelings.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// BACKFILL STALE — leads whose quiz answers are from an older version and
// cannot be rendered into a match. CTA lands on the retake view.
// ─────────────────────────────────────────────
export function emailBackfillStale(p: EmailPersonalization, variant: "A" | "B"): { subject: string; preheader: string; html: string } {
  const preheader = "4 minutes to an updated GLP-1 match.";
  const subject = variant === "B"
    ? "We updated our matching — your answers are from the old version"
    : "Your quiz answers need a refresh";
  return {
    subject,
    preheader,
    html: layout(`
<p>A while back you took our GLP-1 matching quiz. Since then we've rebuilt how we match people to providers — and your answers are from the older version, so we can't honestly hand you a match without a quick refresh.</p>
<p>The new quiz takes about 4 minutes, and you'll get a personalized provider match with pricing the moment you finish.</p>
<p><a href="${p.resultsUrl}" class="cta">Retake the quiz →</a></p>
<p>No pressure either way — and the unsubscribe below always works in one click.</p>
`, p, preheader),
  };
}

// ─────────────────────────────────────────────
// Template lookup
// ─────────────────────────────────────────────
type TemplateFn = (p: EmailPersonalization, variant: "A" | "B") => { subject: string; preheader: string; html: string };
type PostConversionFn = (p: EmailPersonalization) => { subject: string; preheader: string; html: string };

const SEQUENCE_TEMPLATES: Record<string, TemplateFn> = {
  email_0_instant: email0,
  email_1_why_match: email1,
  email_2_cost: email2,
  email_3_side_effects: email3,
  email_4_process: email4,
  email_5_alternatives: email5,
  email_6_closer: email6,
};

const TRIGGERED_TEMPLATES: Record<string, TemplateFn | PostConversionFn> = {
  nudge_still_deciding: emailNudge,
  post_conversion: emailPostConversion as PostConversionFn,
  backfill_a: emailBackfillA,
  backfill_b: emailBackfillB,
  backfill_c: emailBackfillC,
  backfill_stale: emailBackfillStale,
};

export function getEmailTemplate(slug: string): TemplateFn | PostConversionFn | null {
  return SEQUENCE_TEMPLATES[slug] ?? TRIGGERED_TEMPLATES[slug] ?? null;
}

export function isPostConversionTemplate(slug: string): boolean {
  return slug === "post_conversion";
}
