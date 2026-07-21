import { useEffect, useState } from "react";
import { HomepageCta } from "@/components/HomepageCta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  BadgeCheck,
  Stethoscope,
  ClipboardList,
  Truck,
  ArrowRight,
  CheckCircle2,
  Star,
  Clock,
  MapPin,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";
import { preloadQuizExperience } from "@/lib/preloadQuiz";
import { QUIZ_QUESTION_COUNT, QUIZ_MINUTES } from "@shared/quizConfig";

const SITE_URL = "https://www.peptidepilot.me";

const TRUST_BADGES = [
  { icon: BadgeCheck, label: "Licensed US Providers" },
  { icon: ShieldCheck, label: "No Insurance Needed" },
  { icon: Star, label: "Independent & Unbiased" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Take the Quiz",
    description: `Answer ${QUIZ_QUESTION_COUNT} quick questions about your goals, body, and budget. Takes about ${QUIZ_MINUTES} minutes.`,
  },
  {
    step: "02",
    title: "Get Matched",
    description: "We rank licensed telehealth providers prescribing compounded GLP-1 medications by fit for your profile and budget.",
  },
  {
    step: "03",
    title: "Start Your Intake",
    description: "Begin a ~10-minute online intake with your matched provider. A licensed clinician reviews it — no waiting rooms, no insurance.",
  },
];

const MATCH_FACTORS = [
  { icon: Star, label: "Your Goals", description: "Weight target, timeline, and what matters most to you." },
  { icon: ClipboardList, label: "Budget", description: "Monthly price you're comfortable with, all-in." },
  { icon: MapPin, label: "State Availability", description: "Providers licensed to treat where you live." },
  { icon: Stethoscope, label: "Medical Fit", description: "Basic history so matches are appropriate to review." },
  { icon: Truck, label: "Shipping & Speed", description: "How fast medication reaches your door." },
  { icon: ShieldCheck, label: "Provider Vetting", description: "Board-certified clinicians and transparent pricing only." },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const preload = () => {
      preloadQuizExperience();
    };

    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleHandle = window.requestIdleCallback(preload, { timeout: 1200 });
      return () => {
        window.cancelIdleCallback(idleHandle);
      };
    }

    const timeoutHandle = setTimeout(preload, 350);
    return () => clearTimeout(timeoutHandle);
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribed(true);
    toast.success("You're on the list. We'll send GLP-1 pricing and guidance to your inbox.");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Get Matched to GLP-1 Therapy in Minutes"
        description="Medically-supervised weight management from licensed US clinicians. Check your eligibility in minutes. No insurance needed."
        path="/"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PeptidePilot",
          description:
            "Independent matching to licensed GLP-1 telehealth providers based on your goals, budget, and state.",
          url: `${SITE_URL}/`,
        }}
      />
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-gradient text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, oklch(0.58 0.13 195) 0%, transparent 50%), radial-gradient(circle at 75% 20%, oklch(0.72 0.10 175) 0%, transparent 40%)`,
          }}
        />
        <div className="container relative py-14 sm:py-20 md:py-28 text-center">
          {/* Trust chip */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 sm:mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            Licensed US providers · No insurance needed
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight mb-5 sm:mb-6 max-w-3xl mx-auto"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Get matched to Peptide therapy in minutes
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Semaglutide and tirzepatide, matched to the right licensed provider for your goals and budget.{" "}
            <span className="text-white font-semibold">Independent. No insurance required.</span>
          </p>

          <HomepageCta placement="hero">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 transition-all font-semibold text-base px-8 py-5 sm:py-6 h-auto rounded-xl shadow-lg shadow-black/20 group w-full sm:w-auto"
              onMouseEnter={() => preloadQuizExperience()}
              onFocus={() => preloadQuizExperience()}
              onTouchStart={() => preloadQuizExperience()}
            >
              See if you match — free {QUIZ_MINUTES}-minute quiz
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </HomepageCta>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-white/75">
                <Icon className="w-4 h-4 text-white/60 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof Banner ────────────────────────────────────── */}
      <section className="bg-secondary/60 border-y border-border/60 py-4 sm:py-5">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span><strong className="text-foreground">{QUIZ_QUESTION_COUNT} questions</strong>, about {QUIZ_MINUTES} minutes</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Matched to <strong className="text-foreground">vetted licensed providers</strong></span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Compounded GLP-1 medications — <strong className="text-foreground">no insurance</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-badge mb-4">How It Works</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Your GLP-1 match in 3 steps
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base px-2">
              No guesswork, no paid placement. Just an honest ranking of licensed providers for your goals and budget.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step} className="relative text-center group">
                <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px bg-border -z-0" />
                <div className="relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-gradient text-white flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                    <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{step}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="sm:hidden flex justify-center mt-4 mb-2 text-border">
                    <ArrowRight className="w-5 h-5 rotate-90 text-accent/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            <HomepageCta placement="footer">
              <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 font-semibold px-8 py-5 sm:py-6 h-auto rounded-xl w-full sm:w-auto" onMouseEnter={() => preloadQuizExperience()} onFocus={() => preloadQuizExperience()} onTouchStart={() => preloadQuizExperience()}>
                See my match
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </HomepageCta>
          </div>
        </div>
      </section>

      {/* ── What We Match On ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-muted/40">
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-badge mb-4">The Match</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              What we match you on
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base px-2">
              Your {QUIZ_QUESTION_COUNT}-question intake feeds a real ranking — not a generic list — across the factors that actually determine fit.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {MATCH_FACTORS.map(({ icon: Icon, label, description }) => (
              <div
                key={label}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-border/60 hover:border-accent/40 hover:shadow-md transition-all group"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-accent/10 transition-colors">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 sm:mb-1.5 leading-snug">{label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed hidden sm:block">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Receive + Match Preview ───────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="section-badge mb-4 lg:mx-0">What You Receive</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Your best-fit provider, ranked and explained.
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
                Your results rank licensed GLP-1 providers by fit for your goals, budget, and state — each with a plain-English reason, a starting price, and a direct link to begin intake. You see exactly who fits and why.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8">
                {[
                  "Your top-matched provider with a fit score",
                  "Two ranked alternatives to compare",
                  "Starting monthly price — medication + visits included",
                  "What happens at intake and how fast it ships",
                  "Saved to a personal link you can return to anytime",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 lg:justify-start justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <HomepageCta placement="footer">
                <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 font-semibold px-8 rounded-xl w-full sm:w-auto" onMouseEnter={() => preloadQuizExperience()} onFocus={() => preloadQuizExperience()} onTouchStart={() => preloadQuizExperience()}>
                  See if you match
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </HomepageCta>
            </div>
            {/* Right: illustrative match card (no research peptides, no vendor links) */}
            <div className="flex-1 w-full max-w-sm lg:max-w-none">
              <div className="rounded-2xl border border-border/60 bg-white shadow-xl overflow-hidden">
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-sm font-semibold text-white">Your GLP-1 Match</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-white/70">Example</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">#1 Ranked provider</p>
                      <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>Licensed GLP-1 provider</h3>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {["Semaglutide", "Tirzepatide", "No insurance"].map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-accent" style={{ fontFamily: "'DM Serif Display', serif" }}>92%</div>
                      <div className="text-xs text-muted-foreground">fit</div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full" style={{ width: "92%", background: "linear-gradient(90deg, #0d9488, #0891b2)" }} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    One flat monthly price covering the medication, provider visits, and ongoing support. Matched to your budget and licensed to treat in your state — with a licensed clinician reviewing your intake.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["Medication included", "Provider visits", "Ships to your door"].map((v) => (
                      <span key={v} className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent font-semibold">{v}</span>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-2">
                  {["Alternative provider", "Alternative provider"].map((name, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 bg-muted/50" style={{ filter: `blur(${(i + 1) * 2}px)`, opacity: 0.5 }}>
                      <span className="text-sm font-semibold text-foreground">#{i + 2} {name}</span>
                      <span className="text-lg font-bold text-muted-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>{88 - i * 6}%</span>
                    </div>
                  ))}
                  <p className="text-center text-xs text-muted-foreground pt-1">Take the quiz to see your real matches</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Independent Positioning ────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container max-w-3xl text-center">
          <div className="section-badge mb-5 sm:mb-6">Why PeptidePilot</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-5 sm:mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Independent by design
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6 px-2">
            We don't manufacture or sell GLP-1 medications, and no provider can pay us for a higher ranking. We do earn a commission when you start treatment through our links — that's how the service stays free to you — but it never changes who we rank first. The match is the match.
          </p>
          <div className="bg-secondary/60 border border-border/40 rounded-2xl p-5 sm:p-6 mb-8 text-left">
            <p className="text-sm font-semibold text-foreground mb-2">What happens after you get your match?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can start a ~10-minute online intake with your matched provider whenever you're ready. A licensed clinician decides whether treatment is appropriate — nothing is automatic, and you stay in full control.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
            {[
              { title: "No Paid Placement", body: "Rankings are based on fit and independent vetting — never payment for position." },
              { title: "Vetted Providers Only", body: "Board-certified clinicians, transparent pricing, and real medication sourcing." },
              { title: "Free to You", body: "You never pay us. Providers pay a standard referral fee, like a comparison site." },
            ].map(({ title, body }) => (
              <div key={title} className="bg-secondary/50 rounded-xl p-4 sm:p-5 border border-border/40">
                <CheckCircle2 className="w-5 h-5 text-accent mb-3" />
                <h4 className="font-semibold text-foreground text-sm mb-1.5">{title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Email Capture ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-secondary/40 border-y border-border/60">
        <div className="container max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Not ready for the quiz?
          </h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-2">
            Get straight-talk GLP-1 guidance — real pricing, what to expect, and how telehealth intake works — in your inbox.
          </p>
          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-accent font-medium">
              <CheckCircle2 className="w-5 h-5" />
              You're on the list. Talk soon.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 rounded-xl border-border/80 bg-white text-base"
                required
              />
              <Button
                type="submit"
                size="lg"
                className="bg-brand-gradient text-white hover:opacity-90 font-semibold h-12 rounded-xl px-6 whitespace-nowrap"
              >
                Subscribe
              </Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" /> 100% free. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-brand-gradient text-white">
        <div className="container text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 sm:mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Ready to see your match?
          </h2>
          <p className="text-white/75 text-base sm:text-lg mb-7 sm:mb-8 max-w-lg mx-auto px-2">
            About {QUIZ_MINUTES} minutes. Get matched to a licensed GLP-1 provider for your goals and budget — completely free.
          </p>
          <HomepageCta placement="footer">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 py-5 sm:py-6 h-auto rounded-xl shadow-lg shadow-black/20 group w-full sm:w-auto"
              onMouseEnter={() => preloadQuizExperience()}
              onFocus={() => preloadQuizExperience()}
              onTouchStart={() => preloadQuizExperience()}
            >
              See if you match — free {QUIZ_MINUTES}-minute quiz
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </HomepageCta>
        </div>
      </section>
    </div>
  );
}
