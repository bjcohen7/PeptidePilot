import { z } from "zod";
import { eq } from "drizzle-orm";
import { providers } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

export const providersRouter = router({

  list: publicProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const cond = input?.activeOnly ? eq(providers.active, true) : undefined;
      const rows = cond
        ? await db.select().from(providers).where(cond).orderBy(providers.sortPriority)
        : await db.select().from(providers).orderBy(providers.sortPriority);
      return rows.map((r) => ({
        ...r,
        affiliateUrlTemplate: r.affiliateUrlTemplate,
      }));
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(providers).where(eq(providers.slug, input.slug)).limit(1);
      return rows[0] ?? null;
    }),

  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(providers).orderBy(providers.sortPriority);
  }),

  adminUpsert: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      slug: z.string().min(1).max(64),
      displayName: z.string().min(1).max(128),
      priceFromCents: z.number().int(),
      priceNote: z.string().max(255).optional().nullable(),
      included: z.array(z.string()),
      medsOffered: z.enum(["oral", "injectable", "both"]),
      statesAvailable: z.union([z.array(z.string()), z.literal("ALL")]),
      cashPayFriendly: z.boolean().default(true),
      shipDaysEstimate: z.number().int().optional().nullable(),
      affiliateUrlTemplate: z.string().min(1).max(1024),
      bountyCents: z.number().int().optional().nullable(),
      promoCode: z.string().max(64).optional().nullable(),
      active: z.boolean().default(true),
      sortPriority: z.number().int().default(50),
      complianceNote: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const data = {
        slug: input.slug,
        displayName: input.displayName,
        priceFromCents: input.priceFromCents,
        priceNote: input.priceNote ?? null,
        included: input.included,
        medsOffered: input.medsOffered,
        statesAvailable: input.statesAvailable,
        cashPayFriendly: input.cashPayFriendly,
        shipDaysEstimate: input.shipDaysEstimate ?? null,
        affiliateUrlTemplate: input.affiliateUrlTemplate,
        bountyCents: input.bountyCents ?? null,
        promoCode: input.promoCode ?? null,
        active: input.active,
        sortPriority: input.sortPriority,
        complianceNote: input.complianceNote ?? null,
      };

      if (input.id) {
        await db.update(providers).set(data).where(eq(providers.id, input.id));
        return { id: input.id };
      }
      const [result] = await db.insert(providers).values(data);
      return { id: Number(result.insertId) };
    }),

  adminSetActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(providers).set({ active: input.active }).where(eq(providers.id, input.id));
      return { success: true };
    }),
});
