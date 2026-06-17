let quizFlowPromise: Promise<unknown> | null = null;
let processingPromise: Promise<unknown> | null = null;
let resultsPromise: Promise<unknown> | null = null;

export function preloadQuizFlow() {
  if (!quizFlowPromise) {
    quizFlowPromise = import("@/pages/QuizFlow");
  }
  return quizFlowPromise;
}

export function preloadProcessing() {
  if (!processingPromise) {
    processingPromise = import("@/pages/Processing");
  }
  return processingPromise;
}

export function preloadResults() {
  if (!resultsPromise) {
    resultsPromise = import("@/pages/Results");
  }
  return resultsPromise;
}

export function preloadQuizExperience() {
  void preloadQuizFlow();
}

export function preloadQuizCompletionExperience() {
  void preloadProcessing();
  void preloadResults();
}
