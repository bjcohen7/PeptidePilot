import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getUnsubscribeSecret } from "./resend";
import { createHmac } from "crypto";

let _emailSchemaBootstrap: Promise<void> | null = null;

/**
 * Run once at boot: create email_queue table and add suppression columns to leads.
 */
export async function ensureEmailSchema() {
  const db = await getDb();
  if (!db) return;

  if (!_emailSchemaBootstrap) {
    _emailSchemaBootstrap = (async () => {
      // 1. Create email_queue table (with leads-matching collation)
      await db.execute(sql.raw(
        "CREATE TABLE IF NOT EXISTS `email_queue` (" +
        "`id` int AUTO_INCREMENT NOT NULL, " +
        "`lead_id` varchar(36) NOT NULL, " +
        "`email_slug` varchar(64) NOT NULL, " +
        "`subject_variant` enum('A','B') NOT NULL DEFAULT 'A', " +
        "`scheduled_at` timestamp NOT NULL, " +
        "`sent_at` timestamp NULL, " +
        "`opened_at` timestamp NULL, " +
        "`clicked_at` timestamp NULL, " +
        "`bounced_at` timestamp NULL, " +
        "`complained_at` timestamp NULL, " +
        "`status` enum('pending','sent','failed','cancelled','bounced','complained') NOT NULL DEFAULT 'pending', " +
        "`error` text, " +
        "`resend_id` varchar(128), " +
        "`created_at` timestamp NOT NULL DEFAULT (now()), " +
        "CONSTRAINT `email_queue_id` PRIMARY KEY(`id`), " +
        "KEY `ix_eq_lead_id` (`lead_id`), " +
        "KEY `ix_eq_status_scheduled` (`status`, `scheduled_at`), " +
        "KEY `ix_eq_resend_id` (`resend_id`)" +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci"
      ));

      // Fix collation mismatch on existing table — must match leads table (utf8mb4_0900_ai_ci)
      try {
        await db.execute(sql.raw("ALTER TABLE `email_queue` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"));
      } catch (e: any) {
        console.error("[EmailSchema] Collation fix failed:", e?.sqlMessage || e?.cause?.sqlMessage || e);
      }

      // 2. Add columns to email_queue if missing
      const addQueueColumn = async (col: string, def: string) => {
        try {
          const result = await db.execute(sql.raw("SHOW COLUMNS FROM `email_queue` LIKE '" + col + "'"));
          const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : [];
          if (rows.length === 0) {
            await db.execute(sql.raw("ALTER TABLE `email_queue` ADD COLUMN " + def));
          }
        } catch (e: any) {
          if (e?.code !== "ER_DUP_FIELDNAME") {
            console.error("[EmailSchema] Failed to add queue column " + col + ":", e?.sqlMessage || e);
          }
        }
      };

      await addQueueColumn("subject_variant", "`subject_variant` ENUM('A','B') NOT NULL DEFAULT 'A'");

      // 3. Add suppression/tracking columns to leads
      const addLeadColumn = async (col: string, def: string) => {
        try {
          const result = await db.execute(sql.raw("SHOW COLUMNS FROM `leads` LIKE '" + col + "'"));
          const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : [];
          if (rows.length === 0) {
            await db.execute(sql.raw("ALTER TABLE `leads` ADD COLUMN " + def));
          }
        } catch (e: any) {
          if (e?.code !== "ER_DUP_FIELDNAME") {
            console.error("[EmailSchema] Failed to add lead column " + col + ":", e?.sqlMessage || e);
          }
        }
      };

      await addLeadColumn("suppressed", "`suppressed` BOOLEAN NOT NULL DEFAULT FALSE");
      await addLeadColumn("email_delivered", "`email_delivered` BOOLEAN NOT NULL DEFAULT FALSE");
      await addLeadColumn("sequence_status", "`sequence_status` ENUM('active','paused','completed','cancelled') NOT NULL DEFAULT 'active'");
      await addLeadColumn("last_email_sent_at", "`last_email_sent_at` TIMESTAMP NULL");
      await addLeadColumn("nudge_sent", "`nudge_sent` BOOLEAN NOT NULL DEFAULT FALSE");
      await addLeadColumn("conversion_at", "`conversion_at` TIMESTAMP NULL");
    })().catch((error) => {
      _emailSchemaBootstrap = null;
      console.error("[EmailSchema] Bootstrap failed:", error);
    });
  }

  await _emailSchemaBootstrap;
}

/**
 * Generate an HMAC-signed unsubscribe token for a lead.
 * Token format: base64(leadId:HMAC)
 */
export function generateUnsubscribeToken(leadId: string): string {
  const secret = getUnsubscribeSecret();
  const hmac = createHmac("sha256", secret).update(leadId).digest("hex").slice(0, 32);
  return Buffer.from(leadId + ":" + hmac).toString("base64url");
}

/**
 * Verify and decode an unsubscribe token. Returns leadId or null if invalid.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [leadId, providedHmac] = decoded.split(":");
    if (!leadId || !providedHmac) return null;

    const secret = getUnsubscribeSecret();
    const expectedHmac = createHmac("sha256", secret).update(leadId).digest("hex").slice(0, 32);
    if (providedHmac !== expectedHmac) return null;

    return leadId;
  } catch {
    return null;
  }
}
