import { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

export function QuizProvider({ children }: { children: ReactNode }) {
  const totalQuestions = QUIZ_QUESTIONS.length;

  const [state, setState] = useState<QuizState>({
    answers: new Array(totalQuestions).fill(null),
    currentIndex: 0,
    isComplete: false,
  });

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
    setState({
      answers: new Array(totalQuestions).fill(null),
      currentIndex: 0,
      isComplete: false,
    });
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
