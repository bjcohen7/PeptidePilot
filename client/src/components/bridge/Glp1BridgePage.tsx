import { useEffect } from "react";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import StickySkipButton from "./StickySkipButton";

type Glp1BridgePageProps = {
  matchName: string;
  matchPercent: number;
  onSkipToProviders: () => void;
};

const LEARN_LINK_TODO = "#"; // TODO: wire to /learn/<slug> when article pages exist

function LearnLink({ title, desc }: { title: string; desc: string }) {
  return (
    <a
      href={LEARN_LINK_TODO}
      className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#e6f7f1] px-4 py-3.5 no-underline transition hover:bg-[#d4ede4]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#0a6b54]">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-[#4a5b58]">{desc}</div>
      </div>
      <span className="flex-shrink-0 text-[16px] text-[#0a6b54]">→</span>
    </a>
  );
}

export default function Glp1BridgePage({ matchName, matchPercent, onSkipToProviders }: Glp1BridgePageProps) {
  useEffect(() => {
    trackMetaCustomEvent("BridgeView", { matchPercent, matchName });
  }, [matchPercent, matchName]);

  const handleSkip = () => {
    trackMetaCustomEvent("BridgeToProviders", { ctaType: "final" });
    onSkipToProviders();
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0e1f1c]" style={{ paddingBottom: 120 }}>
      {/* Sticky skip button */}
      <StickySkipButton href="#" onClick={onSkipToProviders} />

      <div className="mx-auto max-w-[760px] px-5 pb-[120px] pt-10 md:px-5">
        {/* Section label tag */}
        <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-[#e6f7f1] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0a6b54]">
          Bridge Page
        </div>

        {/* ===== 1. HERO ===== */}
        <div className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a6b54]">
          Your Results Are Ready
        </div>
        <h1
          className="mt-3 text-[34px] leading-[1.15] tracking-[-0.01em] md:text-[34px]"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          GLP-1 therapy is your strongest match
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[#4a5b58]">
          Your profile aligns closely with candidates who respond well to GLP-1 therapy. Before you explore providers, read through what GLP-1 actually does, what the research shows, and what real users experience — so you can move forward with confidence.
        </p>

        <div className="h-6" />

        {/* ===== 2. MATCH BREAKDOWN ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            Your Match Breakdown
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-start gap-4 rounded-xl border border-[#e2e8e5] p-[18px]">
              <div
                className="flex-shrink-0 text-[28px] leading-none text-[#0a6b54]"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {matchPercent}%
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0a6b54]">
                  Primary Recommendation
                </div>
                <h4 className="mt-1 text-[16px] font-semibold">GLP-1 therapy</h4>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4a5b58]">
                  Semaglutide or Tirzepatide — prescription-based, clinically validated weight loss therapy with the strongest evidence base for your profile.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-[#e2e8e5] p-[18px]">
              <div
                className="flex-shrink-0 text-[28px] leading-none text-[#8a939b]"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {/* 64% is static bridge copy, not derived from match data */}
                64%
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a939b]">
                  Optional Complement
                </div>
                <h4 className="mt-1 text-[16px] font-semibold">Peptide support</h4>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4a5b58]">
                  BPC-157 or CJC-1295 alongside GLP-1 for recovery and body composition. Not required to see results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 3. SCIENCE ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            The Science — How GLP-1 Works
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5b58]">
            GLP-1 receptor agonists mimic glucagon-like peptide-1, a hormone your gut naturally releases after eating. They work with your biology on three distinct pathways:
          </p>
          <div className="mt-[18px] grid gap-4 md:grid-cols-3">
            <div>
              <h5 className="text-[14px] font-semibold text-[#0a6b54]">Appetite regulation</h5>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Acts on hypothalamic receptors to reduce hunger signals and lower food-seeking behavior between meals.</p>
            </div>
            <div>
              <h5 className="text-[14px] font-semibold text-[#0a6b54]">Gastric emptying</h5>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Slows the rate at which food leaves your stomach, extending the feeling of fullness after each meal.</p>
            </div>
            <div>
              <h5 className="text-[14px] font-semibold text-[#0a6b54]">Insulin sensitivity</h5>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Stimulates glucose-dependent insulin release and suppresses glucagon, stabilizing blood sugar and reducing fat storage signals.</p>
            </div>
          </div>
          <LearnLink
            title="Deep dive: how GLP-1 receptor agonists work"
            desc="A full breakdown of the biology, receptor pathways, and why GLP-1 outperforms traditional weight loss approaches."
          />
        </div>

        {/* ===== 4. RESEARCH ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            What the Research Shows
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5b58]">
            GLP-1 therapy is among the most studied weight loss interventions in modern medicine. The clinical evidence is substantial:
          </p>
          <div className="mt-4">
            <div className="flex items-start gap-4 border-b border-[#eef2f0] py-4">
              <div className="flex-shrink-0 w-[64px] text-[26px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>15%</div>
              <div>
                <h5 className="text-[14px] font-semibold">STEP 1 trial — Semaglutide 2.4mg</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Average body weight reduction over 68 weeks. 86% of participants achieved at least 5% weight loss. Published in NEJM, 2021.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 border-b border-[#eef2f0] py-4">
              <div className="flex-shrink-0 w-[64px] text-[26px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>20%</div>
              <div>
                <h5 className="text-[14px] font-semibold">SURMOUNT-1 trial — Tirzepatide 15mg</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Average body weight reduction over 72 weeks. Dual GIP+GLP-1 action consistently outperforms single-agonist therapies in head-to-head comparisons.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 border-b border-[#eef2f0] py-4">
              <div className="flex-shrink-0 w-[64px] text-[18px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>5+ yrs</div>
              <div>
                <h5 className="text-[14px] font-semibold">Long-term safety data</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">GLP-1 agonists have been used clinically since 2005 for type 2 diabetes, with robust longitudinal safety profiles across diverse populations.</p>
              </div>
            </div>
          </div>
          <div className="mt-[18px] grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-[#e6f7f1] p-3.5 text-center">
              <div className="text-[20px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>86%</div>
              <div className="mt-1 text-[11px] leading-tight text-[#4a5b58]">lost 5%+ body weight on semaglutide</div>
            </div>
            <div className="rounded-xl bg-[#e6f7f1] p-3.5 text-center">
              <div className="text-[20px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>2–4 wks</div>
              <div className="mt-1 text-[11px] leading-tight text-[#4a5b58]">typical onset of appetite suppression</div>
            </div>
            <div className="rounded-xl bg-[#e6f7f1] p-3.5 text-center">
              <div className="text-[20px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>1–2 lbs</div>
              <div className="mt-1 text-[11px] leading-tight text-[#4a5b58]">average weekly loss at therapeutic dose</div>
            </div>
            <div className="rounded-xl bg-[#e6f7f1] p-3.5 text-center">
              <div className="text-[20px] leading-none text-[#0a6b54]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Once/wk</div>
              <div className="mt-1 text-[11px] leading-tight text-[#4a5b58]">injection frequency for most protocols</div>
            </div>
          </div>
          <LearnLink
            title="GLP-1 clinical trials explained in plain English"
            desc="What STEP 1 and SURMOUNT-1 actually found, what the numbers mean for real-world users, and what the research doesn't tell you."
          />
        </div>

        {/* ===== 5. COMPARE ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            Semaglutide vs Tirzepatide
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5b58]">
            Both are GLP-1 therapies. Your provider will recommend one based on your intake consultation. Here is the key distinction:
          </p>
          <div className="mt-3 grid gap-3.5 md:grid-cols-2">
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <span className="inline-block rounded bg-[#e6f7f1] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#0a6b54]">GLP-1 Agonist</span>
              <h5 className="mt-1.5 text-[18px]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Semaglutide</h5>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Single GLP-1 receptor agonist. Well established, widely available, strong long-term evidence. First-line recommendation for most profiles.</p>
            </div>
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <span className="inline-block rounded bg-[#e6f7f1] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#0a6b54]">GLP-1 + GIP Agonist</span>
              <h5 className="mt-1.5 text-[18px]" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>Tirzepatide</h5>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Dual GLP-1 + GIP agonist. Newer compound with consistently higher average weight loss in trials. Recommended for those who have plateaued or want stronger appetite suppression.</p>
            </div>
          </div>
          <LearnLink
            title="Semaglutide vs Tirzepatide: which is right for you?"
            desc="A side-by-side comparison of efficacy, side effect profiles, cost, and which candidate profiles each compound suits best."
          />
        </div>

        {/* ===== 6. TIMELINE ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            What to Expect Week by Week
          </div>
          <div className="mt-4">
            <div className="flex gap-3.5 border-b border-[#eef2f0] py-3.5">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[13px] font-bold text-[#0a6b54]">1</div>
              <div>
                <h5 className="text-[14px] font-semibold">Weeks 1–2: Titration</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Start at a low dose to minimise side effects. Mild nausea is normal and typically resolves within days. Resist the urge to increase dose early — titration exists for a reason.</p>
              </div>
            </div>
            <div className="flex gap-3.5 border-b border-[#eef2f0] py-3.5">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[13px] font-bold text-[#0a6b54]">2</div>
              <div>
                <h5 className="text-[14px] font-semibold">Weeks 3–6: Appetite shifts</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Most users notice a significant reduction in cravings and hunger between meals. Portions naturally decrease. This is the inflection point most people describe as when it "clicks."</p>
              </div>
            </div>
            <div className="flex gap-3.5 border-b border-[#eef2f0] py-3.5">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[13px] font-bold text-[#0a6b54]">3</div>
              <div>
                <h5 className="text-[14px] font-semibold">Month 2–3: Steady weight loss</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">At therapeutic dose, most users lose 1–2 lbs per week consistently. Energy levels often improve. Blood sugar regulation stabilises for those with insulin resistance.</p>
              </div>
            </div>
            <div className="flex gap-3.5 py-3.5">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[13px] font-bold text-[#0a6b54]">4</div>
              <div>
                <h5 className="text-[14px] font-semibold">Month 4+: Optimisation and maintenance</h5>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4a5b58]">Work with your provider to adjust dosing, assess body composition changes, and build a long-term plan. Some users taper; others maintain a low dose indefinitely.</p>
              </div>
            </div>
          </div>
          <LearnLink
            title="Week-by-week: what to expect on GLP-1 therapy"
            desc="A detailed timeline of the physical and metabolic changes users typically experience from week 1 through month 6."
          />
        </div>

        {/* ===== 7. TESTIMONIALS ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            Real User Experiences
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-[#4a5b58]">Verified results from users who matched to GLP-1 therapy through Peptide Pilot.</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[12px] font-bold text-[#0a6b54]">SR</div>
                <div>
                  <h5 className="text-[13px] font-semibold">S.R. · Female, 42</h5>
                  <span className="text-[11px] text-[#8a939b]">Semaglutide · Started Jan 2024</span>
                </div>
                <div className="ml-auto text-[12px] tracking-[1px] text-amber-500">★★★★★</div>
              </div>
              <p className="mt-2.5 text-[14.5px] italic leading-relaxed text-[#4a5b58]" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                "I had tried everything over 10 years. Within 6 weeks I had lost 11 lbs without feeling deprived once. The consultation process made me feel confident it was the right call. I wish I had done this sooner."
              </p>
              <div className="mt-2 font-mono text-[11px] font-semibold text-[#0a6b54]">Down 26 lbs at 5 months</div>
            </div>
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[12px] font-bold text-[#0a6b54]">MK</div>
                <div>
                  <h5 className="text-[13px] font-semibold">M.K. · Male, 38</h5>
                  <span className="text-[11px] text-[#8a939b]">Tirzepatide · Started Mar 2024</span>
                </div>
                <div className="ml-auto text-[12px] tracking-[1px] text-amber-500">★★★★★</div>
              </div>
              <p className="mt-2.5 text-[14.5px] italic leading-relaxed text-[#4a5b58]" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                "The appetite suppression is genuinely different from anything I have tried. I simply stopped thinking about food constantly. The quiz matched me to tirzepatide and my provider confirmed it was the right call."
              </p>
              <div className="mt-2 font-mono text-[11px] font-semibold text-[#0a6b54]">Down 28 lbs at 4 months</div>
            </div>
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[12px] font-bold text-[#0a6b54]">DL</div>
                <div>
                  <h5 className="text-[13px] font-semibold">D.L. · Female, 51</h5>
                  <span className="text-[11px] text-[#8a939b]">Semaglutide · Started Sep 2024</span>
                </div>
                <div className="ml-auto text-[12px] tracking-[1px] text-amber-500">★★★★★</div>
              </div>
              <p className="mt-2.5 text-[14.5px] italic leading-relaxed text-[#4a5b58]" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                "I was skeptical of the online telehealth model but the provider I found through this quiz was completely legitimate — board-certified physician, regular follow-up check-ins, everything explained clearly from day one."
              </p>
              <div className="mt-2 font-mono text-[11px] font-semibold text-[#0a6b54]">Down 19 lbs at 3 months</div>
            </div>
            <div className="rounded-xl border border-[#e2e8e5] p-[18px]">
              <div className="flex items-center gap-3">
                <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full bg-[#e6f7f1] text-[12px] font-bold text-[#0a6b54]">JP</div>
                <div>
                  <h5 className="text-[13px] font-semibold">J.P. · Male, 45</h5>
                  <span className="text-[11px] text-[#8a939b]">Tirzepatide · Started Nov 2024</span>
                </div>
                <div className="ml-auto text-[12px] tracking-[1px] text-amber-500">★★★★★</div>
              </div>
              <p className="mt-2.5 text-[14.5px] italic leading-relaxed text-[#4a5b58]" style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}>
                "My A1C dropped from 6.1 to 5.4 in three months alongside losing 22 lbs. My GP was actually impressed. The metabolic benefits go well beyond just weight — that surprised me most."
              </p>
              <div className="mt-2 font-mono text-[11px] font-semibold text-[#0a6b54]">Down 22 lbs + A1C improvement at 3 months</div>
            </div>
          </div>
          {/* FTC disclaimer — ships verbatim per legal requirement */}
          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-[#8a939b]">
            Individual results vary. Testimonials reflect the experiences of specific users and are not a guarantee of outcomes. GLP-1 therapy requires a medical consultation and prescription.
          </p>
          <LearnLink
            title="Real-world GLP-1 outcomes: what users actually experience"
            desc="A collection of verified results, common patterns across user profiles, and what distinguishes those who see the strongest outcomes."
          />
        </div>

        {/* ===== 8. FAQ ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            Common Questions
          </div>
          <div className="mt-4 space-y-0">
            <div className="border-b border-[#eef2f0] py-3.5">
              <div className="text-[15px] font-semibold">Do I need a prescription?</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5b58]">Yes — and that is a good thing. Every provider we list includes a medical consultation as part of onboarding. This ensures correct dosing, identifies contraindications, and keeps your protocol safe from day one.</p>
            </div>
            <div className="border-b border-[#eef2f0] py-3.5">
              <div className="text-[15px] font-semibold">Is it legal to purchase through an online provider?</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5b58]">Through licensed telehealth platforms and compounding pharmacies, yes. Our vetted providers operate within current FDA and DEA guidance. We do not list grey-market or unregulated sources.</p>
            </div>
            <div className="border-b border-[#eef2f0] py-3.5">
              <div className="text-[15px] font-semibold">What are the most common side effects?</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5b58]">The most common are GI-related — nausea, reduced appetite, occasional loose stools — particularly during titration. These are typically mild and resolve within 1–2 weeks. Serious side effects are rare and screened for during your consultation.</p>
            </div>
            <div className="border-b border-[#eef2f0] py-3.5">
              <div className="text-[15px] font-semibold">What does it cost per month?</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5b58]">Programs typically range from $150–$400/month depending on compound, dose, and provider. Our vetted list covers multiple price points and clearly shows what is included — no hidden fees.</p>
            </div>
            <div className="py-3.5">
              <div className="text-[15px] font-semibold">What happens if I stop taking it?</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4a5b58]">Appetite typically returns gradually after stopping. Most providers recommend a tapering strategy and concurrent lifestyle changes to preserve results. Discuss this with your provider before starting.</p>
            </div>
          </div>
          <LearnLink
            title="GLP-1 FAQs: everything you need to know before starting"
            desc="Answers to the 30 most common questions about GLP-1 therapy — from dosing and side effects to cost, legality, and long-term use."
          />
        </div>

        {/* ===== 9. SAFETY NOTE ===== */}
        <div className="mb-4 rounded-xl bg-[#e6f7f1] p-5">
          <h5 className="text-[14px] font-semibold text-[#0a6b54]">A note on quality and safety</h5>
          <p className="mt-2 text-[13px] leading-relaxed text-[#4a5b58]">
            The GLP-1 space has grown fast and not all providers meet the same standard. We only list platforms that include licensed medical oversight, use regulated compounding pharmacies, and provide certificates of analysis on their compounds. Never purchase without a medical consultation.
          </p>
        </div>

        {/* ===== 10. VET SECTION ===== */}
        <div className="mb-4 rounded-2xl border border-[#e2e8e5] bg-white p-7">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a939b]">
            How We Vet Every Provider
          </div>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start gap-2.5 text-[14px] text-[#4a5b58]">
              <span className="flex-shrink-0 font-bold text-[#0a6b54]">✓</span>
              Licensed US telehealth platform or compounding pharmacy
            </li>
            <li className="flex items-start gap-2.5 text-[14px] text-[#4a5b58]">
              <span className="flex-shrink-0 font-bold text-[#0a6b54]">✓</span>
              Board-certified physician consultation before dispensing
            </li>
            <li className="flex items-start gap-2.5 text-[14px] text-[#4a5b58]">
              <span className="flex-shrink-0 font-bold text-[#0a6b54]">✓</span>
              Third-party tested compounds with certificates of analysis
            </li>
            <li className="flex items-start gap-2.5 text-[14px] text-[#4a5b58]">
              <span className="flex-shrink-0 font-bold text-[#0a6b54]">✓</span>
              Transparent pricing — no hidden fees or forced subscriptions
            </li>
            <li className="flex items-start gap-2.5 text-[14px] text-[#4a5b58]">
              <span className="flex-shrink-0 font-bold text-[#0a6b54]">✓</span>
              Verified patient reviews and a public track record
            </li>
          </ul>
        </div>

        {/* ===== 11. FINAL CTA ===== */}
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#0a1815] px-6 py-8 text-center md:px-8 md:py-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(94,234,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.04) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="relative">
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold text-[#0e1f1c] no-underline transition active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #0fb88a, #22d3ee)",
                boxShadow: "0 14px 30px rgba(15,184,138,0.4)",
              }}
            >
              View your matched GLP-1 providers →
            </button>
            <div className="mt-3 font-mono text-[12px] tracking-[0.04em] text-[rgba(230,247,241,0.6)]">
              5 vetted providers · Updated monthly · No paid placements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
