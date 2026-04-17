import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuiz } from "@/contexts/QuizContext";
import { calculateMatches } from "../../../shared/scoring";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";

const SLIDE_DURATION = 5000;

interface Slide {
  icon: string;
  domain: string;
  headline: string;
  body: string;
  testimonial: string;
  author: string;
  peptides: string;
  from: string;
  to: string;
}

const BASE_SLIDES: Slide[] = [
  {
    icon: "",
    domain: "SLEEP & RECOVERY",
    headline: "Waking up restored is possible.",
    body: "DSIP and Epithalon work with your body's circadian biology to improve sleep architecture — not by sedating you, but by restoring the deep sleep cycles that repair tissue, consolidate memory, and regulate cortisol.",
    testimonial: "I hadn't slept through the night in years. Two weeks in, I'm getting 7 hours without waking once.",
    author: "David, 47",
    peptides: "DSIP, Epithalon",
    from: "#38bdf8",
    to: "#6366f1",
  },
  {
    icon: "",
    domain: "METABOLISM",
    headline: "Targeted fat loss without systemic side effects.",
    body: "AOD-9604 is a fragment of human growth hormone that stimulates lipolysis without affecting insulin or IGF-1 levels. It signals fat cells directly — no appetite suppression, no cardiovascular strain.",
    testimonial: "AOD-9604 was the first thing that actually moved the scale without side effects.",
    author: "Mark, 42",
    peptides: "AOD-9604, CJC-1295",
    from: "#fb923c",
    to: "#f43f5e",
  },
  {
    icon: "",
    domain: "COGNITIVE PERFORMANCE",
    headline: "Sustained focus. Reduced cognitive fatigue.",
    body: "Semax upregulates BDNF and modulates dopaminergic activity. Selank reduces anxiety-driven cognitive interference. Together, they support the kind of clear, sustained output that stimulants can't replicate.",
    testimonial: "I went from brain fog by 2pm to fully locked in until 6.",
    author: "Rachel, 35",
    peptides: "Semax, Selank",
    from: "#a78bfa",
    to: "#7c3aed",
  },
  {
    icon: "",
    domain: "INJURY & RECOVERY",
    headline: "Accelerated tissue repair at the cellular level.",
    body: "BPC-157 promotes angiogenesis and upregulates growth hormone receptors in tendon and muscle tissue. TB-500 mobilizes actin to accelerate healing in areas with poor blood supply — including joints, ligaments, and cartilage.",
    testimonial: "My shoulder had been wrecked for 3 years. Six weeks on BPC-157 and I'm back to full overhead press.",
    author: "Jason, 38",
    peptides: "BPC-157, TB-500",
    from: "#34d399",
    to: "#0d9488",
  },
  {
    icon: "",
    domain: "IMMUNITY",
    headline: "Immune modulation backed by clinical data.",
    body: "Thymosin Alpha-1 is approved in over 37 countries for immune regulation. It enhances T-cell maturation and NK cell activity without overstimulating inflammatory pathways — a meaningful distinction for anyone with chronic illness or immune dysregulation.",
    testimonial: "Since starting Thymosin Alpha-1, I haven't been sick in 8 months.",
    author: "Laura, 41",
    peptides: "Thymosin Alpha-1, LL-37",
    from: "#60a5fa",
    to: "#4f46e5",
  },
  {
    icon: "",
    domain: "HORMONAL HEALTH",
    headline: "Stimulate your own production — don't replace it.",
    body: "Kisspeptin and Ipamorelin work upstream of the HPG and HPA axes, prompting your body to produce testosterone and growth hormone naturally. The result is physiological optimization without suppressing endogenous function.",
    testimonial: "My energy and drive were completely flatlined. Kisspeptin brought me back to feeling like myself.",
    author: "Chris, 44",
    peptides: "Kisspeptin, Ipamorelin",
    from: "#f472b6",
    to: "#e11d48",
  },
  {
    icon: "",
    domain: "LONGEVITY",
    headline: "Aging is a process you can influence.",
    body: "Epithalon extends telomere length and activates telomerase — the enzyme responsible for cellular repair. GHK-Cu reactivates over 4,000 genes associated with tissue regeneration. This is not anti-aging marketing. It is molecular biology.",
    testimonial: "I'm 52 and my bloodwork looks better than it did at 35. Epithalon was the missing piece.",
    author: "Steve, 52",
    peptides: "Epithalon, GHK-Cu",
    from: "#86efac",
    to: "#16a34a",
  },
  {
    icon: "",
    domain: "YOUR RESULTS",
    headline: "We've identified {count} peptide profiles matched to your biology.",
    body: "Your protocol is ranked by compatibility with your goals, physiology, and lifestyle. Each recommendation includes the supporting evidence, dosing context, and provider options relevant to your profile.",
    testimonial: "This is the first time anything has felt genuinely specific to me — not a generic supplement list.",
    author: "Nicole, 39",
    peptides: "",
    from: "#38bdf8",
    to: "#a855f7",
  },
];

const PRIORITY_MAP: Record<number, number[]> = {
  0: [3, 1, 5, 2, 4, 6, 0],
  1: [1, 5, 3, 0, 2, 4, 6],
  2: [2, 0, 5, 3, 1, 4, 6],
  3: [6, 0, 4, 2, 5, 1, 3],
  4: [0, 3, 5, 2, 4, 1, 6],
  5: [3, 1, 0, 5, 4, 2, 6],
  6: [5, 2, 0, 1, 3, 4, 6],
  7: [3, 0, 1, 5, 4, 2, 6],
};

function getPersonalizedSlides(goalIndex: number): Slide[] {
  const order = PRIORITY_MAP[goalIndex] ?? [0, 1, 2, 3, 4, 5, 6];
  const reordered = order.map((i) => BASE_SLIDES[i]!);
  return [...reordered, BASE_SLIDES[7]!];
}

export default function Processing() {
  const [, navigate] = useLocation();
  const { state } = useQuiz();
  const { answers } = state;

  const goalIndex = (answers[0] as number) ?? 0;
  const slides = getPersonalizedSlides(goalIndex);

  const matchCount = (() => {
    const valid = answers.filter((a) => a !== null) as number[];
    if (valid.length === 0) return 4;
    const matches = calculateMatches(valid);
    return Math.min(5, Math.max(3, matches.filter((m) => m.score > 0.4).length));
  })();

  const [current, setCurrent] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);
  const [testimonialVisible, setTestimonialVisible] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testimonialRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (autoRef.current) clearTimeout(autoRef.current);
    if (testimonialRef.current) clearTimeout(testimonialRef.current);
  };

  const goToResults = useCallback(() => {
    setLeaving(true);
    setTimeout(() => navigate("/results"), 600);
  }, [navigate]);

  const goToSlide = useCallback(
    (index: number) => {
      if (transitioning) return;
      if (index >= slides.length) {
        goToResults();
        return;
      }
      clearTimers();
      setTransitioning(true);
      setCardVisible(false);
      setTestimonialVisible(false);
      setTimeout(() => {
        setCurrent(index);
        setCardVisible(true);
        setTransitioning(false);
        testimonialRef.current = setTimeout(() => setTestimonialVisible(true), 500);
        autoRef.current = setTimeout(() => goToSlide(index + 1), SLIDE_DURATION);
      }, 350);
    },
    [transitioning, slides.length, goToResults] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Bootstrap
  useEffect(() => {
    setTestimonialVisible(false);
    testimonialRef.current = setTimeout(() => setTestimonialVisible(true), 500);
    autoRef.current = setTimeout(() => goToSlide(1), SLIDE_DURATION);
    return clearTimers;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard
  useEffect(() => {
    const hasAnswers = state.answers.some((a) => a !== null);
    if (!hasAnswers) navigate("/quiz");
  }, [state.answers, navigate]);

  const slide = slides[current]!;
  const headline = slide.headline.replace("{count}", String(matchCount));
  const isLast = current === slides.length - 1;

  return (
    <div
      className="min-h-screen flex flex-col transition-opacity duration-600"
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        opacity: leaving ? 0 : 1,
      }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 600, height: 600, top: "-15%", left: "-10%",
            background: `radial-gradient(circle, ${slide.from}1a, transparent 70%)`,
            transition: "background 1.5s ease",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 500, height: 500, bottom: "-15%", right: "-5%",
            background: `radial-gradient(circle, ${slide.to}1a, transparent 70%)`,
            transition: "background 1.5s ease",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-5 pb-3">
        <PeptidePilotLogo height={28} variant="light" />
        <button
          onClick={goToResults}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Skip to results &rarr;
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 h-0.5 bg-white/10 mx-4 sm:mx-6 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${((current + 1) / slides.length) * 100}%`,
            background: `linear-gradient(90deg, ${slide.from}, ${slide.to})`,
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-xl">

          {/* Icon + domain */}
          <div
            className="flex flex-col items-center gap-3 mb-6 transition-all duration-350"
            style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? "translateY(0)" : "translateY(-8px)",
            }}
          >
            <div
              className="w-1 h-8 rounded-full"
              style={{ background: `linear-gradient(180deg, ${slide.from}, ${slide.to})` }}
            />
            <span
              className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
              style={{
                background: `${slide.from}22`,
                color: slide.from,
                border: `1px solid ${slide.from}44`,
              }}
            >
              {slide.domain}
            </span>
          </div>

          {/* Headline + body */}
          <div
            className="text-center mb-6 transition-all duration-350"
            style={{
              opacity: cardVisible ? 1 : 0,
              transform: cardVisible ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <h2
              className="text-white mb-4 leading-snug"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
                fontFamily: "'DM Serif Display', Georgia, serif",
                letterSpacing: "-0.02em",
              }}
            >
              {headline}
            </h2>
            <p
              className="mx-auto leading-relaxed"
              style={{
                fontSize: "clamp(0.95rem, 2.5vw, 1.05rem)",
                color: "rgba(255,255,255,0.6)",
                maxWidth: 520,
                lineHeight: 1.75,
              }}
            >
              {slide.body}
            </p>
          </div>

          {/* Testimonial — staggered reveal */}
          <div
            className="transition-all duration-500"
            style={{
              opacity: testimonialVisible ? 1 : 0,
              transform: testimonialVisible ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <div
              className="rounded-xl p-5 sm:p-6"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <p
                className="italic leading-relaxed mb-3"
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "clamp(0.88rem, 2vw, 0.95rem)",
                  lineHeight: 1.7,
                }}
              >
                &ldquo;{slide.testimonial}&rdquo;
              </p>
              <p
                className="font-semibold tracking-wide"
                style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}
              >
                &mdash; {slide.author}
              </p>
              {slide.peptides && (
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
                      Peptides referenced:{" "}
                    </span>
                    {slide.peptides}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="relative z-10 pb-8 sm:pb-10 flex flex-col items-center gap-4">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="rounded-full transition-all duration-300"
              style={{
                height: 7,
                width: i === current ? 24 : 7,
                background:
                  i === current
                    ? `linear-gradient(90deg, ${slide.from}, ${slide.to})`
                    : i < current
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.12)",
              }}
            />
          ))}
        </div>

        {/* Prev / CTA / Next */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => current > 0 && goToSlide(current - 1)}
            disabled={current === 0 || transitioning}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: current === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              cursor: current === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={isLast ? goToResults : () => goToSlide(current + 1)}
            disabled={transitioning}
            className="px-7 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${slide.from}, ${slide.to})` }}
          >
            {isLast ? "See My Results" : "Next"}
          </button>

          <button
            onClick={() => goToSlide(current + 1)}
            disabled={isLast || transitioning}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: isLast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              cursor: isLast ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
          {current + 1} of {slides.length}
        </p>
      </div>
    </div>
  );
}
