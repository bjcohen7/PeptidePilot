import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let affiliateWorkspaceBootstrap: Promise<void> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function hasColumn(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  table: string,
  column: string
) {
  const result = await db.execute(sql.raw(`SHOW COLUMNS FROM \`${table}\` LIKE '${column}'`));
  const rows = Array.isArray(result) ? result : ((result as any).rows ?? []);
  return rows.length > 0;
}

export async function ensureAffiliateWorkspaceSchema() {
  const db = await getDb();
  if (!db) return;

  if (!affiliateWorkspaceBootstrap) {
    affiliateWorkspaceBootstrap = (async () => {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`affiliate_partners\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`name\` varchar(128) NOT NULL,
          \`category\` varchar(64) NOT NULL,
          \`status\` enum('active','draft','paused') NOT NULL DEFAULT 'draft',
          \`primaryUrl\` varchar(1024) NOT NULL,
          \`notes\` text,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`affiliate_partners_id\` PRIMARY KEY(\`id\`)
        )
      `));

      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`affiliate_links\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`partnerId\` int NOT NULL,
          \`label\` varchar(128) NOT NULL,
          \`url\` varchar(1024) NOT NULL,
          \`placement\` varchar(128) NOT NULL,
          \`peptideId\` varchar(64),
          \`isGlobal\` boolean NOT NULL DEFAULT false,
          \`sortOrder\` int NOT NULL DEFAULT 100,
          \`status\` enum('active','draft','paused') NOT NULL DEFAULT 'draft',
          \`lastTestedAt\` timestamp,
          \`lastTestStatus\` int,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`affiliate_links_id\` PRIMARY KEY(\`id\`)
        )
      `));

      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`affiliate_audit_events\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`actorOpenId\` varchar(64),
          \`actorEmail\` varchar(320),
          \`action\` varchar(64) NOT NULL,
          \`entityType\` varchar(64) NOT NULL,
          \`entityId\` varchar(64),
          \`summary\` text NOT NULL,
          \`metadata\` json,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`affiliate_audit_events_id\` PRIMARY KEY(\`id\`)
        )
      `));

      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`visitor_sessions\` (
          \`id\` varchar(64) NOT NULL,
          \`leadId\` varchar(36),
          \`firstSeenAt\` timestamp NOT NULL DEFAULT (now()),
          \`lastSeenAt\` timestamp NOT NULL DEFAULT (now()),
          \`landingPath\` varchar(512) NOT NULL,
          \`lastPath\` varchar(512),
          \`referrer\` varchar(1024),
          \`utmSource\` varchar(255),
          \`utmMedium\` varchar(255),
          \`utmCampaign\` varchar(255),
          \`utmContent\` varchar(255),
          \`utmTerm\` varchar(255),
          \`userAgent\` text,
          \`pageViewCount\` int NOT NULL DEFAULT 0,
          \`totalDurationMs\` int NOT NULL DEFAULT 0,
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT \`visitor_sessions_id\` PRIMARY KEY(\`id\`)
        )
      `));

      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS \`page_visits\` (
          \`id\` int AUTO_INCREMENT NOT NULL,
          \`sessionId\` varchar(64) NOT NULL,
          \`path\` varchar(512) NOT NULL,
          \`durationMs\` int NOT NULL DEFAULT 0,
          \`referrer\` varchar(1024),
          \`createdAt\` timestamp NOT NULL DEFAULT (now()),
          CONSTRAINT \`page_visits_id\` PRIMARY KEY(\`id\`)
        )
      `));

      if (!(await hasColumn(db, "affiliate_links", "isGlobal"))) {
        await db.execute(sql.raw("ALTER TABLE `affiliate_links` ADD COLUMN `isGlobal` boolean NOT NULL DEFAULT false"));
      }

      if (!(await hasColumn(db, "affiliate_links", "sortOrder"))) {
        await db.execute(sql.raw("ALTER TABLE `affiliate_links` ADD COLUMN `sortOrder` int NOT NULL DEFAULT 100"));
      }

      if (!(await hasColumn(db, "leads", "sessionId"))) {
        await db.execute(sql.raw("ALTER TABLE `leads` ADD COLUMN `sessionId` varchar(64)"));
      }
    })().catch((error) => {
      affiliateWorkspaceBootstrap = null;
      throw error;
    });
  }

  await affiliateWorkspaceBootstrap;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    const isAdminEmail = Boolean(user.email && ENV.adminEmails.includes(user.email.toLowerCase()));

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || isAdminEmail) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
