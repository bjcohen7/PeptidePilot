import { z } from "zod";
import { eq, sql } from "drizzle-orm";
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

  importSeedRows: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Ensure the table exists first
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS providers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(64) NOT NULL UNIQUE,
          display_name VARCHAR(128) NOT NULL,
          price_from_cents INT NOT NULL,
          price_note VARCHAR(255),
          included JSON NOT NULL,
          meds_offered ENUM('oral','injectable','both') NOT NULL,
          states_available JSON NOT NULL,
          cash_pay_friendly BOOLEAN NOT NULL DEFAULT TRUE,
          ship_days_estimate INT,
          affiliate_url_template VARCHAR(1024) NOT NULL,
          bounty_cents INT,
          promo_code VARCHAR(64),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_priority INT NOT NULL DEFAULT 50,
          compliance_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const rows = [
        { slug: 'gala', displayName: 'Gala Health', priceFromCents: 12900, priceNote: 'per month with yearly plan', included: ['Personalized provider match','Unlimited follow-up visits','Medication shipped to your door','Ongoing care coordination'], medsOffered: 'both' as const, statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://galaglp1.com/funnel/start?a=price&_ef_transaction_id=&oid=1&affid=13&src=lp-glp1-top5-mirror-c4e9&sub1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 1, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
        { slug: 'medvi', displayName: 'Medvi', priceFromCents: 19900, priceNote: 'per month', included: ['Board-certified provider','Prescription management','Monthly follow-ups','Medication shipped free'], medsOffered: 'both' as const, statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: false, sortPriority: 2, complianceNote: null }, // medvi RETIRED per partner decision — must stay inactive so it is never matched/rendered
        { slug: 'direct_med', displayName: 'Direct Meds', priceFromCents: 29700, priceNote: 'per month', included: ['Board-certified MD oversight','Prescription management','Monthly follow-ups','Medication shipped free'], medsOffered: 'both' as const, statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 3, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
        { slug: 'sprout', displayName: 'Sprout', priceFromCents: 31900, priceNote: 'per month', included: ['Patient care team','Prescription management','No long-term contracts','Free shipping'], medsOffered: 'both' as const, statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 5, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 4, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
      ];
      let inserted = 0;
      for (const r of rows) {
        await db.insert(providers).values(r).onDuplicateKeyUpdate({ set: { displayName: r.displayName } });
        inserted++;
      }
      return { inserted, message: `Done — ${inserted} providers seeded` };
    }),
});
