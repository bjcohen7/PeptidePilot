import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  ageRange: varchar("ageRange", { length: 32 }).notNull(),
  primaryGoal: varchar("primaryGoal", { length: 255 }).notNull(),
  budget: varchar("budget", { length: 64 }).notNull(),
  topPeptideMatch: varchar("topPeptideMatch", { length: 64 }).notNull(),
  tier: int("tier").notNull(), // 1, 2, or 3
  consentGiven: boolean("consentGiven").notNull().default(false),
  consentTimestamp: timestamp("consentTimestamp").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  rawQuizData: json("rawQuizData").notNull(), // array of 40 answer indices
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
