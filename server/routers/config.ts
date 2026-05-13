import { createHash } from "crypto";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

const telemetryInput = z.object({
  event: z.enum([
    "token_hydration_attempted",
    "token_hydration_succeeded",
    "token_hydration_failed",
    "token_invalid_or_expired",
    "token_replaced_by_url",
  ]),
  path: z.string().min(1).max(512).optional().nullable(),
  sessionId: z.string().min(8).max(64).optional().nullable(),
  tokenSource: z.enum(["url", "localStorage"]).optional().nullable(),
  reason: z.string().min(1).max(255).optional().nullable(),
  token: z.string().min(8).max(128).optional().nullable(),
});

export const configRouter = router({
  getFeatureFlags: publicProcedure.query(() => ({
    ENABLE_RETURNING_USER_RECOGNITION:
      process.env.ENABLE_RETURNING_USER_RECOGNITION === "true",
  })),

  logTelemetry: publicProcedure.input(telemetryInput).mutation(({ input }) => {
    const telemetryEvent = {
      scope: "returning-user-phase1",
      event: input.event,
      timestamp: new Date().toISOString(),
      path: input.path ?? null,
      sessionId: input.sessionId ?? null,
      tokenSource: input.tokenSource ?? null,
      reason: input.reason ?? null,
      tokenHash: input.token
        ? createHash("sha256").update(input.token).digest("hex").slice(0, 16)
        : null,
    };

    console.info("[ReturningUserTelemetry]", JSON.stringify(telemetryEvent));

    return { success: true } as const;
  }),
});
