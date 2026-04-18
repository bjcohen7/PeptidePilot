import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  FlaskConical,
  Star,
  ArrowRight,
  CheckCircle2,
  Brain,
  Dumbbell,
  Moon,
  Zap,
  Heart,
  Sparkles,
  Activity,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Independent & Unbiased" },
  { icon: FlaskConical, label: "Science-Backed" },
  { icon: Star, label: "Free Analysis" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Take the Quiz",
    description: "Answer 20 targeted questions about your goals, body, and lifestyle. Takes just 5 minutes.",
  },
  {
    step: "02",
    title: "Get Your Profile",
    description: "Our algorithm evaluates your responses across 8 biological domains to find your optimal peptide matches.",
  },
  {
    step: "03",
    title: "Review Your Plan",
    description: "Receive personalized, unbiased recommendations and trusted sourcing options.",
  },
];

const SCIENCE_AREAS = [
  { icon: Dumbbell, label: "Goals & Performance", description: "Muscle, fat loss, endurance, and athletic output." },
  { icon: Activity, label: "Body & Fitness", description: "Training type, recovery, and body composition." },
  { icon: Heart, label: "Hormones & Aging", description: "Hormonal balance, libido, and longevity markers." },
  { icon: Moon, label: "Sleep & Recovery", description: "Sleep architecture, restoration, and circadian health." },
  { icon: Zap, label: "Pain & Injury", description: "Joint health, tissue repair, and gut integrity." },
  { icon: Brain, label: "Cognition & Mood", description: "Focus, memory, anxiety, and neuroprotection." },
  { icon: Sparkles, label: "Skin, Hair & Appearance", description: "Collagen synthesis, elasticity, and hair health." },
  { icon: Clock, label: "Lifestyle & Preferences", description: "Budget, experience, administration, and routine." },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubscribed(true);
    toast.success("You're subscribed! Check your inbox for weekly peptide science tips.");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Seo
        title="Personalized Peptide Recommendations"
        description="Take the free 5-minute PeptidePilot quiz to get independent, science-backed peptide recommendations tailored to your goals, biology, and lifestyle."
        path="/"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PeptidePilot",
          description:
            "Independent peptide research and personalized peptide matching based on your goals, biology, and lifestyle.",
          url: `${typeof window !== "undefined" ? window.location.origin : "https://peptidepilot.me"}/`,
        }}
      />
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-gradient text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 50%, oklch(0.58 0.13 195) 0%, transparent 50%), radial-gradient(circle at 75% 20%, oklch(0.72 0.10 175) 0%, transparent 40%)`,
          }}
        />
        <div className="container relative py-14 sm:py-20 md:py-28 text-center">
          {/* Social proof chip */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 sm:mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            Trusted by thousands of health-focused individuals
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight mb-5 sm:mb-6 max-w-3xl mx-auto"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Struggling to Optimize Your Health and Performance?
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Discover the specific peptides matched to your unique biology, goals, and lifestyle.{" "}
            <span className="text-white font-semibold">100% independent analysis.</span>
          </p>

          <Link href="/quiz">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 transition-all font-semibold text-base px-8 py-5 sm:py-6 h-auto rounded-xl shadow-lg shadow-black/20 group w-full sm:w-auto"
            >
              Take the 5-Minute Quiz
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>

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

      {/* ── Social Proof Banner ───────────────────────────────────── */}
      <section className="bg-secondary/60 border-y border-border/60 py-4 sm:py-5">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span><strong className="text-foreground">20 questions</strong> across 8 biological domains</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span><strong className="text-foreground">12</strong> evidence-based peptide profiles</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Connected to <strong className="text-foreground">vetted telehealth providers</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-badge mb-4">How It Works</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Your Personalized Protocol in 3 Steps
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base px-2">
              No guesswork. No bias. Just a rigorous analysis of your biology matched to the most relevant peptide research.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step} className="relative text-center group">
                {/* Connector line — desktop only */}
                <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px bg-border -z-0" />
                <div className="relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-gradient text-white flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                    <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{step}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                {/* Mobile step connector arrow */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="sm:hidden flex justify-center mt-4 mb-2 text-border">
                    <ArrowRight className="w-5 h-5 rotate-90 text-accent/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            <Link href="/quiz">
              <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 font-semibold px-8 py-5 sm:py-6 h-auto rounded-xl w-full sm:w-auto">
                Start Your Free Analysis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Science Section ───────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-muted/40">
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-badge mb-4">The Science</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
              The Science Behind Your Profile
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base px-2">
              Our quiz evaluates 8 thematic areas across 20 targeted questions to build a complete biological picture — not a generic recommendation.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {SCIENCE_AREAS.map(({ icon: Icon, label, description }) => (
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

      {/* ── Report Mockup / What You Get ───────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="section-badge mb-4 lg:mx-0">What You Receive</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                A report built around your biology, not a generic list.
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">
                Your PeptidePilot report ranks peptides by compatibility with your specific goals, body, and lifestyle. Each match includes a plain-English explanation, a compatibility score, and links to vetted sourcing options — so you know exactly what you're getting and why.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground mb-8">
                {[
                  "Top peptide match with full compatibility breakdown",
                  "4 additional ranked alternatives",
                  "Dosing guidance and cycle length notes",
                  "Trusted vendor options for each peptide",
                  "Optional connection to telehealth providers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 lg:justify-start justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/quiz">
                <Button size="lg" className="bg-brand-gradient text-white hover:opacity-90 font-semibold px-8 rounded-xl w-full sm:w-auto">
                  Get My Free Report
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            {/* Right: mockup card */}
            <div className="flex-1 w-full max-w-sm lg:max-w-none">
              <div className="rounded-2xl border border-border/60 bg-white shadow-xl overflow-hidden">
                {/* Card header */}
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-sm font-semibold text-white">Top Match</span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">#1 Ranked</p>
                      <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>BPC-157</h3>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {["Recovery", "Gut Health", "Joints"].map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-accent" style={{ fontFamily: "'DM Serif Display', serif" }}>94%</div>
                      <div className="text-xs text-muted-foreground">match</div>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                    <div className="h-full rounded-full" style={{ width: "94%", background: "linear-gradient(90deg, #0d9488, #0891b2)" }} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                    A stable pentadecapeptide with extensive research supporting tissue repair, gut lining integrity, and joint recovery. Particularly well-matched to your injury history and recovery goals.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["Peptide Sciences", "Core Peptides"].map((v) => (
                      <span key={v} className="text-xs px-3 py-1.5 rounded-lg border border-accent/30 text-accent font-semibold">{v} ↗</span>
                    ))}
                  </div>
                </div>
                {/* Blurred rows below */}
                <div className="px-5 pb-5 space-y-2">
                  {["TB-500", "Ipamorelin"].map((name, i) => (
                    <div key={name} className="flex items-center justify-between rounded-xl px-4 py-3 bg-muted/50" style={{ filter: `blur(${(i + 1) * 2}px)`, opacity: 0.5 }}>
                      <span className="text-sm font-semibold text-foreground">#{i + 2} {name}</span>
                      <span className="text-lg font-bold text-muted-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>{88 - i * 9}%</span>
                    </div>
                  ))}
                  <p className="text-center text-xs text-muted-foreground pt-1">+ 2 more matches unlocked with your email</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Independent Positioning ───────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-background">
        <div className="container max-w-3xl text-center">
          <div className="section-badge mb-5 sm:mb-6">Why PeptidePilot</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-5 sm:mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            We Have No Skin in the Game
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6 px-2">
            Unlike many peptide platforms that funnel you toward their own proprietary products, PeptidePilot is entirely independent. We don't manufacture, sell, or have financial relationships with any single peptide brand. Our only objective is to match you with the compounds most supported by research for your specific biology.
          </p>
          <div className="bg-secondary/60 border border-border/40 rounded-2xl p-5 sm:p-6 mb-8 text-left">
            <p className="text-sm font-semibold text-foreground mb-2">What happens after you get your results?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If your profile suggests you may benefit from a supervised protocol, we can optionally connect you with vetted telehealth clinics and hormone optimization practices in our network. This is always your choice — never automatic. You remain in full control of what happens next.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
            {[
              { title: "No Proprietary Products", body: "We don't sell peptides. We analyze and recommend based purely on your profile." },
              { title: "Evidence-Based Only", body: "Every recommendation is grounded in peer-reviewed research and clinical data." },
              { title: "Multiple Vendors Listed", body: "We surface several trusted sourcing options so you can compare and choose." },
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

      {/* ── Email Capture ─────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-secondary/40 border-y border-border/60">
        <div className="container max-w-xl text-center">
          <h2 className="text-2xl sm:text-3xl font-normal text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Not Ready for the Quiz?
          </h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base px-2">
            Get weekly peptide science tips, research summaries, and protocol guides — straight to your inbox.
          </p>
          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-accent font-medium">
              <CheckCircle2 className="w-5 h-5" />
              You're subscribed! Welcome to the community.
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
          <p className="text-xs text-muted-foreground mt-3">100% free, always. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-brand-gradient text-white">
        <div className="container text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 sm:mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Ready to Discover Your Match?
          </h2>
          <p className="text-white/75 text-base sm:text-lg mb-7 sm:mb-8 max-w-lg mx-auto px-2">
            Take 5 minutes. Get a personalized peptide protocol built around your unique biology — completely free.
          </p>
          <Link href="/quiz">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 py-5 sm:py-6 h-auto rounded-xl shadow-lg shadow-black/20 group w-full sm:w-auto"
            >
              Take the Free Quiz
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
