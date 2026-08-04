// Temporary audit probe — creates test- sentinel leads on PROD. DELETE at end.
import fs from "node:fs";
import mysql from "mysql2/promise";

const BASE = "https://www.peptidepilot.me/api/trpc";
const url = fs.readFileSync(
  "/private/tmp/claude-501/-Users-bencohen-Documents-Claude-Projects-Tipstr-PeptidePilot/9f26c19b-2965-441d-9420-a34bdf6f8dc9/scratchpad/dburl.txt",
  "utf8",
).trim();

async function trpc(path: string, json: unknown) {
  const res = await fetch(`${BASE}/${path}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { json } }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

const wl = [1, 1, 1, 3, 1, 3, 2, 2, 0, 2, 2, 1, 0, 0, 1, 1, 1, 0, 0, 2, 0, 1];
const nonwl = [3, 2, 2, 1, 1, 0, 2, 3, 0, 2, 2, 1, 0, 0, 1, 1, 1, 0, 0, 2, 0, 3];
const wlskip = [1, 1, 1, 3, 1, 0, 2, 2, 0, 2, 2, 1, 0, 0, 1, 1, 1, 0, 0, 2, 0, 1];

const submits = [
  { tag: "wl", json: { email: "test-audit-wl@peptidepilot.me", firstName: "Audwl", consentGiven: true, answers: wl, sessionId: "test-audit-wl-1", meta: { heightIn: 70, weightLbs: 240 } } },
  { tag: "nonwl", json: { email: "test-audit-nonwl@peptidepilot.me", firstName: "Audnon", consentGiven: true, answers: nonwl, sessionId: "test-audit-nonwl-1" } },
  { tag: "wlskip", json: { email: "test-audit-wlskip@peptidepilot.me", firstName: "Audskip", consentGiven: true, answers: wlskip, sessionId: "test-audit-wlskip-1" } },
  { tag: "anon", json: { consentGiven: false, answers: wl, sessionId: "test-audit-anon-1" } },
];

const conn = await mysql.createConnection(url);
const created: Record<string, { publicId: string; leadId: string }> = {};
try {
  for (const s of submits) {
    const r = await trpc("quiz.submitQuiz", s.json);
    const data = (r.body?.[0]?.result?.data?.json ?? r.body?.[0]?.result?.data) as any;
    const publicId = data?.publicId;
    if (!publicId) {
      console.log(s.tag, "FAILED", r.status, JSON.stringify(r.body).slice(0, 400));
      continue;
    }
    // Immediately cancel any queued emails so nothing goes to Resend.
    const [rows] = await conn.execute("SELECT id FROM leads WHERE publicId = ?", [publicId]);
    const leadId = (rows as any[])[0]?.id;
    const [upd] = await conn.execute(
      "UPDATE email_queue SET status='cancelled' WHERE lead_id = ? AND status='pending'",
      [leadId],
    );
    created[s.tag] = { publicId, leadId };
    console.log(s.tag, "publicId=", publicId, "leadId=", leadId, "emails_cancelled=", (upd as any).affectedRows);
  }

  // attachEmail on the anonymous lead (A6 second call site).
  if (created.anon) {
    const r = await trpc("quiz.attachEmail", {
      leadId: created.anon.leadId,
      email: "test-audit-attach@peptidepilot.me",
      firstName: "Audattach",
      consentGiven: true,
    });
    console.log("attachEmail status", r.status, JSON.stringify(r.body).slice(0, 300));
    const [upd] = await conn.execute(
      "UPDATE email_queue SET status='cancelled' WHERE lead_id = ? AND status='pending'",
      [created.anon.leadId],
    );
    console.log("attach emails_cancelled=", (upd as any).affectedRows);
  }

  // Verify persisted first_name on all four leads.
  const ids = Object.values(created).map((c) => c.publicId);
  if (ids.length) {
    const [rows] = await conn.execute(
      `SELECT publicId, email, first_name, topPeptideMatch, height_in, weight_lbs, experiment_variant FROM leads WHERE publicId IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    console.log(JSON.stringify(rows, null, 1));
  }
} finally {
  await conn.end();
}
