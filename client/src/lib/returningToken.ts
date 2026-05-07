export const RETURNING_TOKEN_KEY = "peptidepilot_returning_token";

type ResolveReturningTokenResult = {
  activeToken: string | null;
  shouldToastReplacement: boolean;
  shouldPersistUrlToken: boolean;
};

export function resolveReturningToken(
  urlToken: string | null,
  existingToken: string | null,
): ResolveReturningTokenResult {
  if (urlToken) {
    return {
      activeToken: urlToken,
      shouldToastReplacement: Boolean(existingToken && existingToken !== urlToken),
      shouldPersistUrlToken: true,
    };
  }

  return {
    activeToken: existingToken,
    shouldToastReplacement: false,
    shouldPersistUrlToken: false,
  };
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };

  return candidate.data?.code ?? candidate.shape?.data?.code ?? null;
}

export function shouldClearReturningToken(error: unknown) {
  const code = getErrorCode(error);
  return code === "NOT_FOUND" || code === "BAD_REQUEST" || code === "UNAUTHORIZED";
}
