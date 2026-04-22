let quizEntryPromise: Promise<unknown> | null = null;
let quizFlowPromise: Promise<unknown> | null = null;

export function preloadQuizEntry() {
  if (!quizEntryPromise) {
    quizEntryPromise = import("@/pages/QuizEntry");
  }
  return quizEntryPromise;
}

export function preloadQuizFlow() {
  if (!quizFlowPromise) {
    quizFlowPromise = import("@/pages/QuizFlow");
  }
  return quizFlowPromise;
}

export function preloadQuizExperience() {
  void preloadQuizEntry();
  void preloadQuizFlow();
}
