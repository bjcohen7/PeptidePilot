import { Router } from "express";
import { Webhook } from "svix";
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getResendWebhookSecret } from "./resend";
import { suppressLead, updateEmailByResendId } from "./queue";

const webhookRouter = Router();

/**
 * POST /api/email/webhook — Resend webhook receiver with Svix signature verification.
 * Handles: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */
webhookRouter.post("/", async (req, res) => {
  const secret = getResendWebhookSecret();
  if (!secret) {
    console.error("[EmailWebhook] RESEND_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "webhook not configured" });
    return;
  }

  // Svix signature verification
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[EmailWebhook] Missing Svix headers");
    res.status(401).json({ error: "missing signature headers" });
    return;
  }

  // The route is mounted with express.raw(), so req.body is the raw Buffer of
  // the exact bytes Resend signed. Verify against those bytes — NOT a
  // re-serialized copy, which would never match the signature.
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString("utf8")
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  const wh = new Webhook(secret);
  let event: { type?: string; data?: { email_id?: string } };
  try {
    // svix's verify() both checks the signature and returns the parsed payload.
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type?: string; data?: { email_id?: string } };
  } catch (err) {
    console.warn("[EmailWebhook] Signature verification failed:", err);
    res.status(401).json({ error: "invalid signature" });
    return;
  }

  // Signature valid — process event
  const { type, data } = event;
  const resendId = data?.email_id;

  if (!type || !resendId) {
    res.status(400).json({ error: "missing type or email_id" });
    return;
  }

  console.log(`[EmailWebhook] Received: ${type} for ${resendId}`);

  switch (type) {
    case "email.delivered":
      await updateEmailByResendId(resendId, { delivered_at: true });
      break;

    case "email.opened":
      await updateEmailByResendId(resendId, { opened_at: true });
      break;

    case "email.clicked":
      await updateEmailByResendId(resendId, { clicked_at: true });
      break;

    case "email.bounced":
      await updateEmailByResendId(resendId, { status: "bounced", bounced_at: true });
      break;

    case "email.complained":
      await updateEmailByResendId(resendId, { status: "complained", complained_at: true });
      break;

    default:
      break;
  }

  // Suppress on bounce or complaint
  if (type === "email.bounced" || type === "email.complained") {
    try {
      const db = await getDb();
      if (db) {
        const [rows] = await db.execute(sql.raw(`
          SELECT lead_id FROM email_queue WHERE resend_id = '${resendId}' LIMIT 1
        `));
        const result = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
        if (result.length > 0) {
          const leadId = (result[0] as any).lead_id;
          await suppressLead(leadId, type);
          console.log(`[EmailWebhook] Suppressed lead ${leadId} due to ${type}`);
        }
      }
    } catch (err) {
      console.error(`[EmailWebhook] Failed to suppress on ${type}:`, err);
    }
  }

  res.status(200).json({ ok: true });
});

export default webhookRouter;
