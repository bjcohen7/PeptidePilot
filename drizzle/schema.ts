import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leads table — stores every quiz submission with full compliance data.
 */
export const leads = mysqlTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  email: varchar("email", { length: 320 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }),
  returningToken: varchar("returningToken", { length: 128 }),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  ageRange: varchar("ageRange", { length: 32 }).notNull(),
  primaryGoal: varchar("primaryGoal", { length: 255 }).notNull(),
  budget: varchar("budget", { length: 64 }).notNull(),
  topPeptideMatch: varchar("topPeptideMatch", { length: 64 }).notNull(),
  tier: int("tier").notNull(), // 1, 2, or 3
  consentGiven: boolean("consentGiven").notNull().default(false),
  consentTimestamp: timestamp("consentTimestamp").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  source: varchar("source", { length: 64 }),
  rawQuizData: json("rawQuizData").notNull(), // array of quiz answer indices
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Affiliate click tracking table.
 */
export const affiliateClicks = mysqlTable("affiliate_clicks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: varchar("leadId", { length: 36 }).notNull(),
  peptideId: varchar("peptideId", { length: 64 }).notNull(),
  vendor: varchar("vendor", { length: 128 }).notNull(),
  clickedAt: timestamp("clickedAt").defaultNow().notNull(),
});

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = typeof affiliateClicks.$inferInsert;

/**
 * Blog posts table for the /blog section.
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Affiliate partners are managed separately from peptide profiles so partner
 * links can be added, paused, tested, and audited without editing scoring code.
 */
export const affiliatePartners = mysqlTable("affiliate_partners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["active", "draft", "paused"]).default("draft").notNull(),
  primaryUrl: varchar("primaryUrl", { length: 1024 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliatePartner = typeof affiliatePartners.$inferSelect;
export type InsertAffiliatePartner = typeof affiliatePartners.$inferInsert;

/**
 * Individual affiliate links can target a partner, peptide, page, or funnel slot.
 */
export const affiliateLinks = mysqlTable("affiliate_links", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  placement: varchar("placement", { length: 128 }).notNull(),
  peptideId: varchar("peptideId", { length: 64 }),
  isGlobal: boolean("isGlobal").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(100),
  cardHeadlineValue: varchar("cardHeadlineValue", { length: 128 }),
  cardHeadlineUnit: varchar("cardHeadlineUnit", { length: 128 }),
  cardPromoText: varchar("cardPromoText", { length: 255 }),
  cardCouponCode: varchar("cardCouponCode", { length: 64 }),
  cardBadge: varchar("cardBadge", { length: 64 }),
  status: mysqlEnum("status", ["active", "draft", "paused"]).default("draft").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestStatus: int("lastTestStatus"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = typeof affiliateLinks.$inferInsert;

/**
 * Audit trail for affiliate operations, including assistant-driven changes.
 */
export const affiliateAuditEvents = mysqlTable("affiliate_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorOpenId: varchar("actorOpenId", { length: 64 }),
  actorEmail: varchar("actorEmail", { length: 320 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }),
  summary: text("summary").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AffiliateAuditEvent = typeof affiliateAuditEvents.$inferSelect;
export type InsertAffiliateAuditEvent = typeof affiliateAuditEvents.$inferInsert;

/**
 * Lightweight first-party visitor session tracking for admin visibility.
 */
export const visitorSessions = mysqlTable("visitor_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  leadId: varchar("leadId", { length: 36 }),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  landingPath: varchar("landingPath", { length: 512 }).notNull(),
  lastPath: varchar("lastPath", { length: 512 }),
  referrer: varchar("referrer", { length: 1024 }),
  utmSource: varchar("utmSource", { length: 255 }),
  utmMedium: varchar("utmMedium", { length: 255 }),
  utmCampaign: varchar("utmCampaign", { length: 255 }),
  utmContent: varchar("utmContent", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  userAgent: text("userAgent"),
  pageViewCount: int("pageViewCount").notNull().default(0),
  totalDurationMs: int("totalDurationMs").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = typeof visitorSessions.$inferInsert;

export const pageVisits = mysqlTable("page_visits", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  path: varchar("path", { length: 512 }).notNull(),
  durationMs: int("durationMs").notNull().default(0),
  referrer: varchar("referrer", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = typeof pageVisits.$inferInsert;

export const clickEvents = mysqlTable("click_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  leadId: varchar("leadId", { length: 36 }),
  path: varchar("path", { length: 512 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  targetHref: varchar("targetHref", { length: 1024 }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClickEvent = typeof clickEvents.$inferSelect;
export type InsertClickEvent = typeof clickEvents.$inferInsert;

export type VariantConfig = {
  funnel: { step: string; page: string; template: string }[];
  copy?: Record<string, string>;
};

export const experiments = mysqlTable("experiments", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  hypothesis: text("hypothesis"),
  status: mysqlEnum("status", ["draft", "running", "paused", "winner", "archived"]).notNull().default("draft"),
  primaryMetric: varchar("primary_metric", { length: 64 }).notNull().default("affiliate_click"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  winnerVariantId: int("winner_variant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const experimentVariants = mysqlTable("experiment_variants", {
  id: int("id").autoincrement().primaryKey(),
  experimentId: int("experiment_id").notNull(),
  name: varchar("name", { length: 32 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  trafficWeight: int("traffic_weight").notNull().default(50),
  config: json("config").$type<VariantConfig>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uq_exp_variant").on(t.experimentId, t.name),
]);

export const experimentAssignments = mysqlTable("experiment_assignments", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  experimentId: int("experiment_id").notNull(),
  variantId: int("variant_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("uq_session_experiment").on(t.sessionId, t.experimentId),
  index("ix_assign_exp_variant").on(t.experimentId, t.variantId),
]);

export const experimentEvents = mysqlTable("experiment_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  experimentId: int("experiment_id").notNull(),
  variantId: int("variant_id").notNull(),
  event: varchar("event", { length: 48 }).notNull(),
  page: varchar("page", { length: 128 }),
  meta: json("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ix_evt_exp_variant_event").on(t.experimentId, t.variantId, t.event),
  index("ix_evt_session").on(t.sessionId),
  index("ix_evt_created").on(t.createdAt),
]);

export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = typeof experiments.$inferInsert;
export type ExperimentVariant = typeof experimentVariants.$inferSelect;
export type InsertExperimentVariant = typeof experimentVariants.$inferInsert;
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;
export type InsertExperimentAssignment = typeof experimentAssignments.$inferInsert;
export type ExperimentEvent = typeof experimentEvents.$inferSelect;
export type InsertExperimentEvent = typeof experimentEvents.$inferInsert;
