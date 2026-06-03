import { useEffect, useCallback, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQuiz } from "@/contexts/QuizContext";
import { useSwipe } from "@/hooks/useSwipe";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import ContraindicationOffRamp from "@/components/bridge/ContraindicationOffRamp";
import { preloadProcessing, preloadResults } from "@/lib/preloadQuiz";
import { QUIZ_QUESTIONS } from "../../../shared/scoring";

type Direction = "forward" | "backward";

// Indices of multi-select questions (0-indexed)
const MULTI_SELECT_INDICES = new Set([13, 15, 16]); // Q14, Q16, Q17
const TOP_TWO_INDEX = 19; // Q20

// Q17 contraindication indices
const PREGNANCY_INDEX = 0;
const MTC_INDEX = 1;

function isMultiSelect(index: number) {
  return MULTI_SELECT_INDICES.has(index);
}

function isTopTwo(index: number) {
  return index === TOP_TWO_INDEX;
}

function hasContraindication(answer: number[]): boolean {
  return answer.includes(PREGNANCY_INDEX) || answer.includes(MTC_INDEX);
}

export default function QuizFlow() {
  const [, navigate] = useLocation();
  const { state, selectAnswer, goTo, completeQuiz, currentQuestion } = useQuiz();

  const { currentIndex, answers, isComplete } = state;

  const totalQuestions = QUIZ_QUESTIONS.length;
  const isFirst = currentIndex === 0;
  const multiSelect = isMultiSelect(currentIndex);
  const topTwo = isTopTwo(currentIndex);

  const [showOffRamp, setShowOffRamp] = useState(false);

  const [animClass, setAnimClass] = useState<string>("quiz-slide-enter-forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const directionRef = useRef<Direction>("forward");
  const prevIndexRef = useRef(currentIndex);

  // Refs to avoid stale closures in callbacks
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  useEffect(() => {
    if (currentIndex !== prevIndexRef.current) {
      const dir = directionRef.current;
      setAnimClass(dir === "forward" ? "quiz-slide-enter-forward" : "quiz-slide-enter-backward");
      prevIndexRef.current = currentIndex;
      setIsTransitioning(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    void preloadProcessing();
    void preloadResults();
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
    [isTransitioning],
  );

  const advance = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      goTo(currentIndex + 1);
    } else {
      completeQuiz();
    }
  }, [currentIndex, totalQuestions, goTo, completeQuiz]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }, [currentIndex, goTo]);

  // ── Single-select handler ──────────────────────────────────────────────

  const handleSingleSelect = useCallback(
    (idx: number) => {
      if (isTransitioning) return;
      const val = answersRef.current[currentIndexRef.current];
      if (val !== null) return;
      selectAnswer(idx);
      setTimeout(() => {
        triggerAdvance("forward", advance);
      }, 320);
    },
    [isTransitioning, selectAnswer, triggerAdvance, advance],
  );

  // ── Multi-select helpers ───────────────────────────────────────────────

  const getCurrentMulti = useCallback((): number[] => {
    const val = answersRef.current[currentIndexRef.current];
    return Array.isArray(val) ? val : [];
  }, []);

  const handleMultiToggle = useCallback(
    (idx: number) => {
      if (isTransitioning) return;
      const current: number[] = getCurrentMulti();
      const ci = currentIndexRef.current;

      if (topTwo) {
        // Q20: top-2 behavior
        if (current.includes(idx)) {
          const next = current.filter((i) => i !== idx);
          selectAnswer(next);
          return;
        }
        if (current.length >= 2) {
          setPulseIndex(idx);
          setTimeout(() => setPulseIndex(null), 300);
          return;
        }
        const next = [...current, idx];
        selectAnswer(next);
        if (next.length === 2) {
          setTimeout(() => {
            triggerAdvance("forward", advance);
          }, 400);
        }
        return;
      }

      // Regular multi-select
      const optionsLen = QUIZ_QUESTIONS[ci]?.options.length ?? 0;
      const isNoneIndex = optionsLen - 1;
      if (idx === isNoneIndex) {
        selectAnswer([idx]);
        return;
      }
      if (current.includes(isNoneIndex)) {
        selectAnswer([idx]);
        return;
      }
      if (current.includes(idx)) {
        selectAnswer(current.filter((i) => i !== idx));
      } else {
        selectAnswer([...current, idx]);
      }
    },
    [isTransitioning, selectAnswer, topTwo, triggerAdvance, advance, getCurrentMulti],
  );

  // ── Multi-select continue ──────────────────────────────────────────────

  const handleMultiContinue = useCallback(() => {
    const current = getCurrentMulti();
    const ci = currentIndexRef.current;
    if (current.length === 0 || isTransitioning) return;

    // Q17: check for contraindications
    if (ci === 16 && hasContraindication(current)) {
      setShowOffRamp(true);
      return;
    }

    triggerAdvance("forward", advance);
  }, [isTransitioning, triggerAdvance, advance, getCurrentMulti]);

  // ── Back ───────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (showOffRamp) {
      setShowOffRamp(false);
      return;
    }
    if (isFirst || isTransitioning) return;
    triggerAdvance("backward", goBack);
  }, [showOffRamp, isFirst, isTransitioning, triggerAdvance, goBack]);

  // ── Swipe ──────────────────────────────────────────────────────────────

  const handleSwipeLeft = useCallback(() => {
    if (showOffRamp) return;
    if (multiSelect || topTwo) {
      const current = getCurrentMulti();
      if (current.length > 0 && !isTransitioning) {
        handleMultiContinue();
      }
      return;
    }
    const val = answersRef.current[currentIndexRef.current];
    if (val !== null && !isTransitioning) {
      triggerAdvance("forward", advance);
    }
  }, [showOffRamp, multiSelect, topTwo, getCurrentMulti, handleMultiContinue, isTransitioning, triggerAdvance, advance]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleBack,
    threshold: 60,
    verticalThreshold: 80,
  });

  if (!currentQuestion) return null;

  const multiSelection = getCurrentMulti();
  const multiHasSelection = multiSelection.length > 0;

  // ── Off-ramp screen ────────────────────────────────────────────────────

  if (showOffRamp) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-hidden">
        <header className="border-b border-border/60 bg-white/95 backdrop-blur-md sticky top-0 z-40">
          <div className="container">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center">
                <PeptidePilotLogo height={30} variant="dark" />
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <ContraindicationOffRamp />
        </main>
      </div>
    );
  }

  const singleVal = answersRef.current[currentIndexRef.current];

  return (
    <div
      className="min-h-screen bg-background flex flex-col overflow-hidden"
      {...swipeHandlers}
    >
      <header className="border-b border-border/60 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center">
              <PeptidePilotLogo height={30} variant="dark" />
            </Link>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
              {currentIndex + 1} <span className="text-border">/</span> {totalQuestions}
            </span>
          </div>
          <div className="h-1.5 bg-border/50 -mx-4 sm:-mx-6 lg:-mx-8">
            <div
              className="progress-bar-fill h-full transition-all duration-500"
              style={{ width: `${Math.round((currentIndex / totalQuestions) * 100)}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4 overflow-hidden">
        <div key={currentIndex} className={`w-full max-w-2xl ${animClass}`}>
          <h2
            className="text-xl sm:text-2xl md:text-3xl font-normal text-foreground mb-7 sm:mb-8 leading-snug"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const selected = multiSelect || topTwo
                ? multiSelection.includes(idx)
                : singleVal === idx;
              const showPulse = topTwo && pulseIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (multiSelect || topTwo) {
                      handleMultiToggle(idx);
                    } else {
                      handleSingleSelect(idx);
                    }
                  }}
                  disabled={!multiSelect && !topTwo && (singleVal !== null || isTransitioning)}
                  aria-pressed={selected}
                  className={`answer-btn ${multiSelect ? "option-card--compact" : ""} ${selected ? "selected" : ""} ${
                    showPulse ? "animate-pulse-once" : ""
                  } ${
                    !multiSelect && !topTwo && singleVal !== null && !selected
                      ? "opacity-40 cursor-default"
                      : ""
                  }`}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`${
                        multiSelect || topTwo
                          ? "w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all"
                          : "answer-indicator w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                      } ${
                        selected
                          ? "border-accent bg-accent"
                          : "border-border"
                      }`}
                    >
                      {selected && (
                        multiSelect || topTwo ? (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )
                      )}
                    </div>
                    <span className="text-sm sm:text-base leading-snug text-left flex-1">
                      {option}
                    </span>
                    {selected && !multiSelect && !topTwo ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {(multiSelect || topTwo) && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button
                onClick={handleMultiContinue}
                disabled={!multiHasSelection || isTransitioning}
                className="gap-2 px-6"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
              {topTwo && (
                <p className="text-xs text-muted-foreground text-center">
                  Select up to 2 — choose the ones that resonate most.
                </p>
              )}
              {multiSelect && !topTwo && (
                <p className="text-xs text-muted-foreground text-center">
                  Select all that apply, then continue.
                </p>
              )}
            </div>
          )}


        </div>
      </main>

      <footer className="border-t border-border/60 bg-white/95 backdrop-blur-md sticky bottom-0">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={(isFirst && !showOffRamp) || isTransitioning}
              className="text-muted-foreground hover:text-foreground gap-2 h-10 px-3 sm:px-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalQuestions }).map((_, i) => {
                const answered = answers[i] !== null;
                const isActive = i === currentIndex;
                return (
                  <div
                    key={i}
                    className={`rounded-full transition-all ${
                      isActive
                        ? "w-4 h-2 bg-accent"
                        : answered
                          ? "w-2 h-2 bg-accent/40"
                          : "w-2 h-2 bg-border"
                    }`}
                  />
                );
              })}
            </div>

            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </footer>
    </div>
  );
}
