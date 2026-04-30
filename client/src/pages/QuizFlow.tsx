import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQuiz } from "@/contexts/QuizContext";
import { useSwipe } from "@/hooks/useSwipe";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import {
  QUIZ_QUESTIONS,
} from "../../../shared/scoring";
type Direction = "forward" | "backward";

const MIDPOINT_BREATHER_AFTER_INDEX = 4;
const MIDPOINT_BREATHER = {
  label: "Quick Checkpoint",
  headline: "We’ve got the shape of your weight-loss profile now.",
  body: "The last few questions help us separate appetite-driven GLP fits from muscle-preserving or budget-sensitive paths, so the final recommendation feels genuinely useful.",
};

export default function QuizFlow() {
  const [, navigate] = useLocation();
  const {
    state,
    selectAnswer,
    goTo,
    completeQuiz,
    currentQuestion,
  } = useQuiz();

  const { currentIndex, answers, isComplete } = state;
  const visibleQuestionIndices = useMemo(
    () => QUIZ_QUESTIONS.map((_, index) => index),
    [],
  );
  const totalQuestions = visibleQuestionIndices.length;
  const currentVisibleIndex = Math.max(
    0,
    visibleQuestionIndices.indexOf(currentIndex),
  );
  const selectedAnswer = answers[currentIndex];
  const isFirst = currentVisibleIndex === 0;

  const currentSectionQuestions = visibleQuestionIndices.filter(
    (index) => QUIZ_QUESTIONS[index]?.section === currentQuestion.section,
  ).length;
  const currentSectionIndex = visibleQuestionIndices
    .slice(0, currentVisibleIndex + 1)
    .filter((index) => QUIZ_QUESTIONS[index]?.section === currentQuestion.section)
    .length;

  const nextQuestionIndex = visibleQuestionIndices[currentVisibleIndex + 1];
  const previousQuestionIndex = visibleQuestionIndices[currentVisibleIndex - 1];

  const [showBreather, setShowBreather] = useState(false);

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
    if (!visibleQuestionIndices.includes(currentIndex)) {
      goTo(visibleQuestionIndices[0] ?? 0);
    }
  }, [currentIndex, goTo, visibleQuestionIndices]);

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

  const moveForward = useCallback(() => {
    if (typeof nextQuestionIndex === "number") {
      goTo(nextQuestionIndex);
      return;
    }
    completeQuiz();
  }, [completeQuiz, goTo, nextQuestionIndex]);

  const moveBackward = useCallback(() => {
    if (typeof previousQuestionIndex === "number") {
      goTo(previousQuestionIndex);
    }
  }, [goTo, previousQuestionIndex]);

  const handleSelectAnswer = useCallback(
    (idx: number) => {
      if (isTransitioning || selectedAnswer !== null) return;
      selectAnswer(idx);

      if (
        typeof nextQuestionIndex === "number" &&
        currentVisibleIndex === MIDPOINT_BREATHER_AFTER_INDEX
      ) {
        setTimeout(() => {
          setShowBreather(true);
          setIsTransitioning(false);
        }, 320);
        return;
      }

      setTimeout(() => {
        triggerAdvance("forward", moveForward);
      }, 320);
    },
    [
      isTransitioning,
      selectedAnswer,
      selectAnswer,
      nextQuestionIndex,
      currentVisibleIndex,
      triggerAdvance,
      moveForward,
    ],
  );

  const handleBreatherContinue = useCallback(() => {
    setShowBreather(false);
    setTimeout(() => {
      triggerAdvance("forward", moveForward);
    }, 80);
  }, [triggerAdvance, moveForward]);

  const handleBack = useCallback(() => {
    if (showBreather) {
      setShowBreather(false);
      return;
    }
    if (isFirst || isTransitioning) return;
    triggerAdvance("backward", moveBackward);
  }, [showBreather, isFirst, isTransitioning, triggerAdvance, moveBackward]);

  const handleSwipeLeft = useCallback(() => {
    if (showBreather) {
      handleBreatherContinue();
      return;
    }
    if (selectedAnswer !== null && !isTransitioning) {
      triggerAdvance("forward", moveForward);
    }
  }, [
    showBreather,
    handleBreatherContinue,
    selectedAnswer,
    isTransitioning,
    triggerAdvance,
    moveForward,
  ]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleBack,
    threshold: 60,
    verticalThreshold: 80,
  });

  if (!currentQuestion) return null;

  const effectiveProgress = Math.round(
    ((currentVisibleIndex + (showBreather ? 0.5 : 0)) / totalQuestions) * 100,
  );
  const progressDotIndex = Math.floor((currentVisibleIndex / totalQuestions) * 10);

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
            {!showBreather && (
              <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
                {currentVisibleIndex + 1} <span className="text-border">/</span> {totalQuestions}
              </span>
            )}
            {showBreather && (
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                Quick checkpoint
              </span>
            )}
          </div>
          <div className="h-1.5 bg-border/50 -mx-4 sm:-mx-6 lg:-mx-8">
            <div
              className="progress-bar-fill h-full transition-all duration-500"
              style={{ width: `${effectiveProgress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-4 overflow-hidden">
        {showBreather && (
          <div className="w-full max-w-lg quiz-slide-enter-forward">
            <div
              className="rounded-2xl p-8 sm:p-10 text-center text-white shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2744 100%)",
              }}
            >
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
                  {MIDPOINT_BREATHER.label}
                </span>
              </div>

              <div
                className="w-12 h-0.5 mx-auto mb-6 rounded-full"
                style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)" }}
              />

              <h2
                className="text-2xl sm:text-3xl font-normal mb-4 leading-snug"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {MIDPOINT_BREATHER.headline}
              </h2>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
                {MIDPOINT_BREATHER.body}
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

        {!showBreather && (
          <div key={currentIndex} className={`w-full max-w-2xl ${animClass}`}>
            <div className="mb-5 sm:mb-6">
              <span className="section-badge">{currentQuestion.section}</span>
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {currentSectionIndex} of {currentSectionQuestions} in this section
              </div>
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-normal text-foreground mb-7 sm:mb-8 leading-snug"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {currentQuestion.question}
            </h2>

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
                    <span className="text-sm sm:text-base leading-snug text-left flex-1">
                      {option}
                    </span>
                    {selectedAnswer === idx ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-5 animate-fade-in">
              Select one answer and we&apos;ll keep things moving. Swipe right to go back.
            </p>
          </div>
        )}
      </main>

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

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalQuestions, 10) }).map((_, i) => {
                const isActive = i === progressDotIndex;
                const isPast = i < progressDotIndex;
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

            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </footer>
    </div>
  );
}
