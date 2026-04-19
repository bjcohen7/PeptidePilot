import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { QUIZ_QUESTIONS } from "../../../shared/scoring";

export interface QuizState {
  answers: (number | null)[];
  currentIndex: number;
  isComplete: boolean;
}

interface QuizContextValue {
  state: QuizState;
  selectAnswer: (answerIndex: number) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
  currentQuestion: typeof QUIZ_QUESTIONS[0];
  progress: number; // 0–100
  currentSection: string;
  totalQuestions: number;
}

const QuizContext = createContext<QuizContextValue | null>(null);
const QUIZ_STORAGE_KEY = "peptidepilot_quiz_state_v1";

function getInitialQuizState(totalQuestions: number): QuizState {
  const emptyState: QuizState = {
    answers: new Array(totalQuestions).fill(null),
    currentIndex: 0,
    isComplete: false,
  };

  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.sessionStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<QuizState> | null;
    if (!parsed || !Array.isArray(parsed.answers)) return emptyState;

    const answers = new Array(totalQuestions).fill(null).map((_, index) => {
      const value = parsed.answers?.[index];
      return typeof value === "number" ? value : null;
    });

    const safeIndex =
      typeof parsed.currentIndex === "number"
        ? Math.min(Math.max(parsed.currentIndex, 0), totalQuestions - 1)
        : 0;

    return {
      answers,
      currentIndex: safeIndex,
      isComplete: Boolean(parsed.isComplete),
    };
  } catch {
    return emptyState;
  }
}

export function QuizProvider({ children }: { children: ReactNode }) {
  const totalQuestions = QUIZ_QUESTIONS.length;

  const [state, setState] = useState<QuizState>(() => getInitialQuizState(totalQuestions));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const selectAnswer = useCallback((answerIndex: number) => {
    setState((prev) => {
      const answers = [...prev.answers];
      answers[prev.currentIndex] = answerIndex;
      return { ...prev, answers };
    });
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      if (prev.currentIndex >= totalQuestions - 1) {
        return { ...prev, isComplete: true };
      }
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, [totalQuestions]);

  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.max(0, prev.currentIndex - 1),
      isComplete: false,
    }));
  }, []);

  const reset = useCallback(() => {
    const nextState = {
      answers: new Array(totalQuestions).fill(null),
      currentIndex: 0,
      isComplete: false,
    };
    setState(nextState);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(QUIZ_STORAGE_KEY);
    }
  }, [totalQuestions]);

  const currentQuestion = QUIZ_QUESTIONS[state.currentIndex];
  const progress = Math.round(((state.currentIndex) / totalQuestions) * 100);
  const currentSection = currentQuestion?.section ?? "";

  return (
    <QuizContext.Provider
      value={{
        state,
        selectAnswer,
        goNext,
        goBack,
        reset,
        currentQuestion,
        progress,
        currentSection,
        totalQuestions,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}
