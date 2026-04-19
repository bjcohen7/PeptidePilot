import { useEffect, useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQuiz } from "@/contexts/QuizContext";
import { useSwipe } from "@/hooks/useSwipe";
import { Link } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { QUIZ_QUESTIONS } from "../../../shared/scoring";

type Direction = "forward" | "backward";

// Breather card data — shown between sections. No emojis. Medical-grade copy.
const SECTION_BREATHERS: Record<string, { label: string; headline: string; body: string }> = {
  "Body & Fitness": {
    label: "Body Composition",
    headline: "Individual biology determines individual outcomes.",
    body: "The same peptide protocol can produce meaningfully different results across individuals. This assessment evaluates your goals, physiology, and lifestyle in combination — not any single factor in isolation.",
  },
  "Age & Hormones": {
    label: "Endocrine Health",
    headline: "Hormones govern nearly every physiological process.",
    body: "Peptides interact directly with the endocrine system. Accurately mapping your hormonal profile is essential to identifying protocols with the highest probability of clinical relevance for your specific situation.",
  },
  "Sleep & Recovery": {
    label: "Recovery & Regeneration",
    headline: "Restorative sleep is a primary driver of tissue repair.",
    body: "Sleep quality influences growth hormone secretion, inflammatory regulation, and cellular regeneration. Targeted peptide support can meaningfully improve the depth and efficiency of your recovery cycles.",
  },
  "Pain & Injury": {
    label: "Musculoskeletal Health",
    headline: "Regenerative peptides operate at the cellular level.",
    body: "Compounds such as BPC-157 and TB-500 have demonstrated tissue-repair and anti-inflammatory properties in preclinical and clinical research. Understanding the nature and history of your injury guides accurate protocol selection.",
  },
  "Cognition & Mood": {
    label: "Neurological Function",
    headline: "Cognitive performance is a measurable, trainable variable.",
    body: "Select peptides support neuroplasticity, neurotransmitter regulation, and cerebral blood flow. This section establishes your cognitive baseline so the algorithm can weight neuroprotective compounds appropriately.",
  },
  "Skin, Hair & Appearance": {
    label: "Dermal & Aesthetic Health",
    headline: "Biological aging is a process that can be modulated.",
    body: "Collagen-stimulating peptides and growth-factor analogs have demonstrated measurable effects on dermal thickness, hair follicle cycling, and tissue elasticity. Your responses here refine the aesthetic component of your match.",
  },
  "Lifestyle & Preferences": {
    label: "Final Section",
    headline: "Practical factors determine long-term adherence.",
    body: "Protocol compliance is as important as protocol selection. This final section captures your lifestyle context and preferences so your matches reflect what you will realistically sustain — not just what is theoretically optimal.",
  },
};

// Compute which question indices trigger a breather before them
function getBreatherIndices(): Set<number> {
  const indices = new Set<number>();
  let lastSection = QUIZ_QUESTIONS[0]?.section ?? "";
  for (let i = 1; i < QUIZ_QUESTIONS.length; i++) {
    const section = QUIZ_QUESTIONS[i]?.section ?? "";
    if (section !== lastSection) {
      indices.add(i);
      lastSection = section;
    }
  }
  return indices;
}

const BREATHER_INDICES = getBreatherIndices();

export default function QuizFlow() {
  const [, navigate] = useLocation();
  const {
    state,
    selectAnswer,
    goNext,
    goBack,
    currentQuestion,
    progress,
    totalQuestions,
  } = useQuiz();

  const { currentIndex, answers, isComplete } = state;
  const selectedAnswer = answers[currentIndex];
  const isFirst = currentIndex === 0;
  const currentSectionQuestions = QUIZ_QUESTIONS.filter(
    (question) => question.section === currentQuestion.section
  ).length;
  const currentSectionIndex =
    QUIZ_QUESTIONS.slice(0, currentIndex + 1).filter(
      (question) => question.section === currentQuestion.section
    ).length;

  // Breather card state
  const [showBreather, setShowBreather] = useState(false);
  const [breatherSection, setBreatherSection] = useState<string>("");

  const [animClass, setAnimClass] = useState<string>("quiz-slide-enter-forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const directionRef = useRef<Direction>("forward");
  const prevIndexRef = useRef(currentIndex);

  useEffect(() => {
    if (currentIndex !== prevIndexRef.current) {
      const dir = directionRef.current;
      setAnimClass(dir === "forward" ? "quiz-slide-enter-forward" : "quiz-slide-enter-backward");
      prevIndexRef.current = currentIndex;
      setIsTransitioning(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    void import("./Processing");
  }, []);

  useEffect(() => {
    if (isComplete) {
      navigate("/processing");
    }
  }, [isComplete, navigate]);

  const triggerAdvance = useCallback(
    (dir: Direction, advanceFn: () => void) => {
      if (isTransitioning) return;
      directionRef.current = dir;
      setIsTransitioning(true);
      setAnimClass(dir === "forward" ? "quiz-slide-exit-forward" : "quiz-slide-exit-backward");
      setTimeout(() => {
        advanceFn();
      }, 220);
    },
    [isTransitioning]
  );

  const handleSelectAnswer = useCallback(
    (idx: number) => {
      if (isTransitioning || selectedAnswer !== null) return;
      selectAnswer(idx);

      // Check if next question starts a new section → show breather
      const nextIdx = currentIndex + 1;
      if (nextIdx < totalQuestions && BREATHER_INDICES.has(nextIdx)) {
        const nextSection = QUIZ_QUESTIONS[nextIdx]?.section ?? "";
        setTimeout(() => {
          setBreatherSection(nextSection);
          setShowBreather(true);
          setIsTransitioning(false);
        }, 320);
      } else {
        setTimeout(() => {
          triggerAdvance("forward", goNext);
        }, 320);
      }
    },
    [isTransitioning, selectedAnswer, selectAnswer, currentIndex, totalQuestions, triggerAdvance, goNext]
  );

  const handleBreatherContinue = useCallback(() => {
    setShowBreather(false);
    setTimeout(() => {
      triggerAdvance("forward", goNext);
    }, 80);
  }, [triggerAdvance, goNext]);

  const handleBack = useCallback(() => {
    if (showBreather) {
      setShowBreather(false);
      return;
    }
    if (isFirst || isTransitioning) return;
    triggerAdvance("backward", goBack);
  }, [showBreather, isFirst, isTransitioning, triggerAdvance, goBack]);

  const handleSwipeLeft = useCallback(() => {
    if (showBreather) {
      handleBreatherContinue();
      return;
    }
    if (selectedAnswer !== null && !isTransitioning) {
      triggerAdvance("forward", goNext);
    }
  }, [showBreather, handleBreatherContinue, selectedAnswer, isTransitioning, triggerAdvance, goNext]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleBack,
    threshold: 60,
    verticalThreshold: 80,
  });

  if (!currentQuestion) return null;

  const breatherData = SECTION_BREATHERS[breatherSection];

  // Effective progress — count breather as half a question
  const effectiveProgress = Math.round(((currentIndex + (showBreather ? 0.5 : 0)) / totalQuestions) * 100);

  return (
    <div
      className="min-h-screen bg-background flex flex-col overflow-hidden"
      {...swipeHandlers}
    >
      {/* Sticky header */}
      <header className="border-b border-border/60 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center">
              <PeptidePilotLogo height={30} variant="dark" />
            </Link>
            {!showBreather && (
              <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
                {currentIndex + 1} <span className="text-border">/</span> {totalQuestions}
              </span>
            )}
            {showBreather && (
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                New section
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-border/50 -mx-4 sm:-mx-6 lg:-mx-8">
            <div
              className="progress-bar-fill h-full transition-all duration-500"
              style={{ width: `${effectiveProgress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4 overflow-hidden">

        {/* BREATHER CARD */}
        {showBreather && breatherData && (
          <div className="w-full max-w-lg quiz-slide-enter-forward">
            <div
              className="rounded-2xl p-8 sm:p-10 text-center text-white shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2744 100%)",
              }}
            >
              {/* Domain label pill — replaces emoji */}
              <div className="flex items-center justify-center mb-6">
                <span
                  className="text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full"
                  style={{
                    background: "rgba(56,189,248,0.15)",
                    color: "#38bdf8",
                    letterSpacing: "0.12em",
                    border: "1px solid rgba(56,189,248,0.25)",
                  }}
                >
                  {breatherData.label}
                </span>
              </div>

              {/* Thin gradient accent line */}
              <div
                className="w-12 h-0.5 mx-auto mb-6 rounded-full"
                style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)" }}
              />

              <h2
                className="text-2xl sm:text-3xl font-normal mb-4 leading-snug"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {breatherData.headline}
              </h2>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
                {breatherData.body}
              </p>
              <button
                onClick={handleBreatherContinue}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* QUESTION CARD */}
        {!showBreather && (
          <div
            key={currentIndex}
            className={`w-full max-w-2xl ${animClass}`}
          >
            {/* Section badge */}
            <div className="mb-5 sm:mb-6">
              <span className="section-badge">{currentQuestion.section}</span>
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {currentSectionIndex} of {currentSectionQuestions} in this section
              </div>
            </div>

            {/* Question */}
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-normal text-foreground mb-7 sm:mb-8 leading-snug"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {currentQuestion.question}
            </h2>

            {/* Answer options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={selectedAnswer !== null || isTransitioning}
                  aria-pressed={selectedAnswer === idx}
                  className={`answer-btn ${selectedAnswer === idx ? "selected" : ""} ${
                    selectedAnswer !== null && selectedAnswer !== idx
                      ? "opacity-40 cursor-default"
                      : ""
                  }`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`answer-indicator w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        selectedAnswer === idx
                          ? "border-accent bg-accent"
                          : "border-border"
                      }`}
                    >
                      {selectedAnswer === idx && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm sm:text-base leading-snug text-left flex-1">{option}</span>
                    {selectedAnswer === idx ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile hint — only on first question */}
            <p className="text-xs text-muted-foreground text-center mt-5 animate-fade-in">
              Select one answer and we&apos;ll keep things moving. Swipe right to go back.
            </p>
          </div>
        )}
      </main>

      {/* Sticky footer with Back button */}
      <footer className="border-t border-border/60 bg-white/95 backdrop-blur-md sticky bottom-0">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={(isFirst && !showBreather) || isTransitioning}
              className="text-muted-foreground hover:text-foreground gap-2 h-10 px-3 sm:px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Button>

            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalQuestions, 10) }).map((_, i) => {
                const questionIdx = Math.floor((currentIndex / totalQuestions) * 10);
                const isActive = i === questionIdx;
                const isPast = i < questionIdx;
                return (
                  <div
                    key={i}
                    className={`rounded-full transition-all ${
                      isActive
                        ? "w-4 h-2 bg-accent"
                        : isPast
                        ? "w-2 h-2 bg-accent/40"
                        : "w-2 h-2 bg-border"
                    }`}
                  />
                );
              })}
            </div>

            {/* Spacer */}
            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </footer>
    </div>
  );
}
