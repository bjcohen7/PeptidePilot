export const RETURNING_TOKEN_KEY = "peptidepilot_returning_token";

export type ReturningTokenSource = "url" | "localStorage" | null;

export function resolveReturningToken(urlToken: string | null, localToken: string | null) {
  const activeToken = urlToken ?? localToken;
  const tokenSource: ReturningTokenSource = urlToken
    ? "url"
    : localToken
      ? "localStorage"
      : null;

  return {
    activeToken,
    tokenSource,
    shouldPersistUrlToken: Boolean(urlToken),
    shouldToastReplacement: Boolean(urlToken && localToken && urlToken !== localToken),
  };
}

export function getReturningTokenErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };

  return candidate.data?.code ?? candidate.shape?.data?.code ?? null;
}

export function shouldClearReturningToken(error: unknown) {
  return getReturningTokenErrorCode(error) === "NOT_FOUND";
}
