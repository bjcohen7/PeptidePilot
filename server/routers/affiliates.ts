import { z } from "zod";
import { and, asc, eq, ne, or } from "drizzle-orm";
import { affiliatePartnerSeeds } from "../../shared/affiliatePartners";
import { affiliateAuditEvents, affiliateLinks, affiliatePartners } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { peptideProfiles } from "../../shared/scoring";
import type { TrpcContext } from "../_core/context";

const partnerInput = z.object({
  name: z.string().min(1).max(128),
  category: z.string().min(1).max(64),
  status: z.enum(["active", "draft", "paused"]).default("draft"),
  primaryUrl: z.string().url(),
  notes: z.string().max(2000).optional().default(""),
});

const linkInput = z.object({
  partnerId: z.number().int().positive(),
  label: z.string().min(1).max(128),
  url: z.string().url(),
  placement: z.string().min(1).max(128),
  peptideId: z.string().max(64).optional().nullable(),
  isGlobal: z.boolean().default(false),
  sortOrder: z.number().int().min(1).max(999).default(100),
  status: z.enum(["active", "draft", "paused"]).default("draft"),
});

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findPeptideId(command: string) {
  const normalizedCommand = normalizeToken(command);
  const match = peptideProfiles.find((profile) => {
    const candidates = [
      profile.id,
      profile.name,
      profile.name.replace(/\//g, " "),
      ...profile.name.split("/"),
    ];
    return candidates.some((candidate) => normalizedCommand.includes(normalizeToken(candidate)));
  });

  return match?.id ?? null;
}

function extractUrl(command: string) {
  return command.match(/https?:\/\/[^\s)]+/i)?.[0] ?? null;
}

function extractSortOrder(command: string) {
  const orderMatch = command.match(/(?:#|number\s*|ordered\s*|order\s*)(\d{1,3})/i);
  if (!orderMatch) return 100;
  const parsed = Number(orderMatch[1]);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 999) : 100;
}

function shouldApplyGlobally(command: string) {
  return /\b(always|global|globally|all result|all cards|everywhere)\b/i.test(command);
}

function inferLabel(command: string, url: string, partnerName?: string) {
  const labelMatch = command.match(/label(?:ed)?\s+["']([^"']+)["']/i);
  if (labelMatch?.[1]) return labelMatch[1].trim();
  if (partnerName) return partnerName;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Partner";
  }
}

function inferPartnerName(command: string, url: string) {
  const partnerMatch = command.match(/(?:partner|vendor)\s+["']?([a-z0-9 ._-]{2,60})["']?/i);
  if (partnerMatch?.[1]) return partnerMatch[1].trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "New Partner";
  }
}

function parseAssistantCommand(command: string) {
  const url = extractUrl(command);
  if (!url) {
    throw new Error("Include a full URL so the assistant knows which link to add or update.");
  }

  const partnerName = inferPartnerName(command, url);
  const label = inferLabel(command, url, partnerName);
  const peptideId = findPeptideId(command);
  const isGlobal = shouldApplyGlobally(command);
  const sortOrder = extractSortOrder(command);
  const placement = /pseo|seo|page/i.test(command) ? "pseo-page" : "results-card";

  return {
    partnerName,
    label,
    url,
    placement,
    peptideId: isGlobal ? null : peptideId,
    isGlobal,
    sortOrder,
  };
}

function matchesScope(
  link: { placement: string; peptideId: string | null; isGlobal: boolean; url: string },
  candidate: { placement: string; peptideId: string | null; isGlobal: boolean; url: string }
) {
  return (
    link.placement === candidate.placement &&
    (link.peptideId ?? null) === (candidate.peptideId ?? null) &&
    link.isGlobal === candidate.isGlobal &&
    link.url === candidate.url
  );
}

async function logAffiliateAudit(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ctx: TrpcContext,
  input: {
    action: string;
    entityType: string;
    entityId?: string | number | null;
    summary: string;
    metadata?: unknown;
  }
) {
  await db.insert(affiliateAuditEvents).values({
    actorOpenId: ctx.user?.openId ?? null,
    actorEmail: ctx.user?.email ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId == null ? null : String(input.entityId),
    summary: input.summary,
    metadata: input.metadata ?? null,
  });
}

async function findOrCreatePartner(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: { name: string; url: string; notes: string }
) {
  const existingPartner = await db
    .select()
    .from(affiliatePartners)
    .where(eq(affiliatePartners.name, input.name))
    .limit(1);

  let partnerId = existingPartner[0]?.id;
  if (!partnerId) {
    const result = await db.insert(affiliatePartners).values({
      name: input.name,
      category: "Affiliate",
      status: "active",
      primaryUrl: input.url,
      notes: input.notes,
    });
    partnerId = Number(result[0].insertId);
  }

  return partnerId;
}

async function findDuplicateLink(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: {
    placement: string;
    peptideId: string | null;
    isGlobal: boolean;
    url: string;
    excludeId?: number;
  }
) {
  const rows = await db.select().from(affiliateLinks);
  return (
    rows.find((row) => {
      if (input.excludeId && row.id === input.excludeId) return false;
      return matchesScope(row, input);
    }) ?? null
  );
}

export const affiliatesRouter = router({
  activeLinksByPeptide: publicProcedure
    .input(z.object({ peptideId: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(affiliateLinks)
        .where(
          and(
            or(eq(affiliateLinks.peptideId, input.peptideId), eq(affiliateLinks.isGlobal, true)),
            eq(affiliateLinks.status, "active")
          )
        )
        .orderBy(asc(affiliateLinks.sortOrder), asc(affiliateLinks.createdAt));
    }),

  listPartners: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return affiliatePartnerSeeds;
    }

    return db.select().from(affiliatePartners).orderBy(asc(affiliatePartners.name));
  }),

  createPartner: adminProcedure.input(partnerInput).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database is required to create affiliate partners.");
    }

    const existing = await db
      .select()
      .from(affiliatePartners)
      .where(or(eq(affiliatePartners.name, input.name), eq(affiliatePartners.primaryUrl, input.primaryUrl)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error("That partner already exists. Edit the current record instead of creating a duplicate.");
    }

    const result = await db.insert(affiliatePartners).values(input);
    const id = Number(result[0].insertId);
    await logAffiliateAudit(db, ctx, {
      action: "create",
      entityType: "affiliate_partner",
      entityId: id,
      summary: `Created affiliate partner ${input.name}.`,
      metadata: input,
    });
    return { status: "created" as const };
  }),

  updatePartner: adminProcedure
    .input(partnerInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is required to update affiliate partners.");
      }

      const { id, ...values } = input;
      const existing = await db
        .select()
        .from(affiliatePartners)
        .where(
          and(
            or(eq(affiliatePartners.name, values.name), eq(affiliatePartners.primaryUrl, values.primaryUrl)),
            ne(affiliatePartners.id, id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Another partner already uses that name or primary URL.");
      }

      await db.update(affiliatePartners).set(values).where(eq(affiliatePartners.id, id));
      await logAffiliateAudit(db, ctx, {
        action: "update",
        entityType: "affiliate_partner",
        entityId: id,
        summary: `Updated affiliate partner ${values.name}.`,
        metadata: values,
      });
      return { status: "updated" as const };
    }),

  setPartnerStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["active", "draft", "paused"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is required to update affiliate partners.");
      }

      const existing = await db
        .select()
        .from(affiliatePartners)
        .where(eq(affiliatePartners.id, input.id))
        .limit(1);

      const partner = existing[0];
      if (!partner) {
        throw new Error("Partner not found.");
      }

      await db
        .update(affiliatePartners)
        .set({ status: input.status })
        .where(eq(affiliatePartners.id, input.id));

      if (input.status === "paused") {
        await db
          .update(affiliateLinks)
          .set({ status: "paused" })
          .where(eq(affiliateLinks.partnerId, input.id));
      }

      await logAffiliateAudit(db, ctx, {
        action: "status_update",
        entityType: "affiliate_partner",
        entityId: input.id,
        summary:
          input.status === "paused"
            ? `Paused affiliate partner ${partner.name} and disabled its tracked links.`
            : `Set affiliate partner ${partner.name} to ${input.status}.`,
        metadata: { status: input.status },
      });

      return { status: "updated" as const };
    }),

  createLink: adminProcedure.input(linkInput).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database is required to create affiliate links.");
    }

    const duplicate = await findDuplicateLink(db, {
      placement: input.placement,
      peptideId: input.isGlobal ? null : input.peptideId ?? null,
      isGlobal: input.isGlobal,
      url: input.url,
    });

    if (duplicate) {
      throw new Error("That tracked link already exists for this scope. Edit the current record instead.");
    }

    const normalizedInput = {
      ...input,
      peptideId: input.isGlobal ? null : input.peptideId ?? null,
    };
    const result = await db.insert(affiliateLinks).values(normalizedInput);
    const id = Number(result[0].insertId);
    await logAffiliateAudit(db, ctx, {
      action: "create",
      entityType: "affiliate_link",
      entityId: id,
      summary: `Created affiliate link ${input.label}.`,
      metadata: normalizedInput,
    });
    return { status: "created" as const };
  }),

  updateLink: adminProcedure
    .input(linkInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is required to update affiliate links.");
      }

      const { id, ...values } = input;
      const normalizedValues = {
        ...values,
        peptideId: values.isGlobal ? null : values.peptideId ?? null,
      };
      const duplicate = await findDuplicateLink(db, {
        placement: normalizedValues.placement,
        peptideId: normalizedValues.peptideId,
        isGlobal: normalizedValues.isGlobal,
        url: normalizedValues.url,
        excludeId: id,
      });

      if (duplicate) {
        throw new Error("Another tracked link already uses this exact scope and URL.");
      }

      await db.update(affiliateLinks).set(normalizedValues).where(eq(affiliateLinks.id, id));
      await logAffiliateAudit(db, ctx, {
        action: "update",
        entityType: "affiliate_link",
        entityId: id,
        summary: `Updated affiliate link ${normalizedValues.label}.`,
        metadata: normalizedValues,
      });
      return { status: "updated" as const };
    }),

  setLinkStatus: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["active", "draft", "paused"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is required to update affiliate links.");
      }

      const existing = await db
        .select()
        .from(affiliateLinks)
        .where(eq(affiliateLinks.id, input.id))
        .limit(1);

      const link = existing[0];
      if (!link) {
        throw new Error("Tracked link not found.");
      }

      await db
        .update(affiliateLinks)
        .set({ status: input.status })
        .where(eq(affiliateLinks.id, input.id));

      await logAffiliateAudit(db, ctx, {
        action: "status_update",
        entityType: "affiliate_link",
        entityId: input.id,
        summary: `Set affiliate link ${link.label} to ${input.status}.`,
        metadata: { status: input.status },
      });

      return { status: "updated" as const };
    }),

  previewAssistantCommand: adminProcedure
    .input(z.object({ command: z.string().min(5).max(2000) }))
    .mutation(async ({ input }) => {
      const parsed = parseAssistantCommand(input.command);
      const db = await getDb();
      const existing =
        db &&
        (await findDuplicateLink(db, {
          placement: parsed.placement,
          peptideId: parsed.peptideId,
          isGlobal: parsed.isGlobal,
          url: parsed.url,
        }));
      const action = existing ? "update" : "create";
      return {
        ...parsed,
        action,
        message: existing
          ? `Ready to update the existing ${parsed.isGlobal ? "global" : parsed.peptideId ? parsed.peptideId : "unscoped"} link and keep it at position #${parsed.sortOrder}.`
          : `Ready to add ${parsed.label} as ${parsed.isGlobal ? "a global" : parsed.peptideId ? `a ${parsed.peptideId}` : "an unscoped"} link at position #${parsed.sortOrder}.`,
      };
    }),

  runAssistantCommand: adminProcedure
    .input(z.object({ command: z.string().min(5).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is required to run affiliate assistant commands.");
      }

      const parsed = parseAssistantCommand(input.command);
      const partnerId = await findOrCreatePartner(db, {
        name: parsed.partnerName,
        url: parsed.url,
        notes: `Created by affiliate assistant from command: ${input.command}`,
      });
      const existing = await findDuplicateLink(db, {
        placement: parsed.placement,
        peptideId: parsed.peptideId,
        isGlobal: parsed.isGlobal,
        url: parsed.url,
      });

      if (existing) {
        await db
          .update(affiliateLinks)
          .set({
            partnerId,
            label: parsed.label,
            sortOrder: parsed.sortOrder,
            status: "active",
          })
          .where(eq(affiliateLinks.id, existing.id));

        await logAffiliateAudit(db, ctx, {
          action: "assistant_update",
          entityType: "affiliate_link",
          entityId: existing.id,
          summary: `Assistant updated affiliate link ${parsed.label}.`,
          metadata: { command: input.command, parsed },
        });

        return {
          status: "updated" as const,
          message: `Updated ${parsed.label} at position #${parsed.sortOrder}.`,
          link: {
            partnerId,
            ...parsed,
          },
        };
      }

      const result = await db.insert(affiliateLinks).values({
        partnerId,
        label: parsed.label,
        url: parsed.url,
        placement: parsed.placement,
        peptideId: parsed.peptideId,
        isGlobal: parsed.isGlobal,
        sortOrder: parsed.sortOrder,
        status: "active",
      });
      const linkId = Number(result[0].insertId);
      await logAffiliateAudit(db, ctx, {
        action: "assistant_create",
        entityType: "affiliate_link",
        entityId: linkId,
        summary: `Assistant created affiliate link ${parsed.label}.`,
        metadata: { command: input.command, parsed },
      });

      return {
        status: "created" as const,
        message: `Added ${parsed.label} as ${parsed.isGlobal ? "a global" : parsed.peptideId ? `a ${parsed.peptideId}` : "an unscoped"} link at position #${parsed.sortOrder}.`,
        link: {
          partnerId,
          ...parsed,
        },
      };
    }),

  seedLegacyLinks: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database is required to seed legacy affiliate links.");
    }

    let createdPartners = 0;
    let createdLinks = 0;

    for (const profile of peptideProfiles) {
      for (let index = 0; index < profile.vendors.length; index += 1) {
        const vendor = profile.vendors[index];
        const existingPartner = await db
          .select()
          .from(affiliatePartners)
          .where(eq(affiliatePartners.name, vendor.name))
          .limit(1);
        const partnerId = await findOrCreatePartner(db, {
          name: vendor.name,
          url: vendor.url,
          notes: "Seeded from legacy scoring vendor links.",
        });
        if (existingPartner.length === 0) {
          createdPartners += 1;
        }

        const existing = await db
          .select()
          .from(affiliateLinks)
          .where(and(eq(affiliateLinks.url, vendor.url), eq(affiliateLinks.peptideId, profile.id)))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(affiliateLinks).values({
            partnerId,
            label: vendor.name,
            url: vendor.url,
            placement: "results-card",
            peptideId: profile.id,
            isGlobal: false,
            sortOrder: (index + 1) * 10,
            status: "active",
          });
          createdLinks += 1;
        }
      }
    }

    await logAffiliateAudit(db, ctx, {
      action: "seed",
      entityType: "affiliate_link",
      summary: `Seeded ${createdLinks} legacy affiliate links.`,
      metadata: { createdPartners, createdLinks },
    });

    return { status: "seeded" as const, createdPartners, createdLinks };
  }),

  testLink: adminProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, { method: "HEAD", redirect: "follow" });
        return {
          ok: response.ok,
          status: response.status,
          finalUrl: response.url,
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          finalUrl: input.url,
          error: error instanceof Error ? error.message : "Unknown link test error",
        };
      }
    }),

  listLinks: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const [links, partners] = await Promise.all([
      db.select().from(affiliateLinks).orderBy(asc(affiliateLinks.sortOrder), asc(affiliateLinks.createdAt)),
      db.select().from(affiliatePartners),
    ]);
    const partnerMap = new Map(partners.map((partner) => [partner.id, partner.name]));

    return links.map((link) => ({
      ...link,
      partnerName: partnerMap.get(link.partnerId) ?? "Unknown partner",
    }));
  }),

  listAuditEvents: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(affiliateAuditEvents).orderBy(asc(affiliateAuditEvents.createdAt));
  }),
});
