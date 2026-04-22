import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createHash } from "crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { analyticsRouter } from "./routers/analytics";
import { publicProcedure, router } from "./_core/trpc";
import { affiliatesRouter } from "./routers/affiliates";
import { configRouter } from "./routers/config";
import { quizRouter } from "./routers/quiz";
import * as db from "./db";

const buildLocalAdminOpenId = (email: string) =>
  `local-admin:${createHash("sha256").update(email).digest("hex").slice(0, 52)}`;

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  analytics: analyticsRouter,
  affiliates: affiliatesRouter,
  config: configRouter,
  quiz: quizRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localAdminLogin: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();

        if (!ENV.adminEmails.includes(email)) {
          throw new Error("This email is not in the admin allowlist.");
        }

        const openId = buildLocalAdminOpenId(email);
        const displayName = email.split("@")[0] || email;

        await db.upsertUser({
          openId,
          email,
          name: displayName,
          loginMethod: "local-admin",
          role: "admin",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.signSession(
          {
            openId,
            appId: ENV.appId || "peptidepilot",
            name: displayName,
          },
          { expiresInMs: 1000 * 60 * 60 * 24 * 365 }
        );

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return {
          success: true,
          email,
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
