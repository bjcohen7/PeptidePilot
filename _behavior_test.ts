import mysql from "mysql2/promise";
import { cancelSequenceForLead, checkStopOnSilence, enqueueNudge } from "./server/email/queue";
import { email6, type EmailPersonalization } from "./server/email/templates";

const DB = "mysql://root:QvduWBIXpKRgzoHBwSpxczOSrlybsujf@nozomi.proxy.rlwy.net:24194/railway";
process.env.DATABASE_URL = DB;

const conn = await mysql.createConnection(DB);
const uuid = () => crypto.randomUUID();
const created: string[] = [];

async function insLead(id: string, extra: Record<string,string|number> = {}) {
  created.push(id);
  const cols: any = { id, publicId: `test-beh-${Date.now()}-${id.slice(0,4)}`, email: "cohen.benjacob@gmail.com",
    ageRange: "25-34", budget: "standard", ipAddress: "127.0.0.1", primaryGoal: "weight-management",
    rawQuizData: "[]", tier: 1, topPeptideMatch: "gala", sequence_status: "active",
    nudge_sent: 0, suppressed: 0, ...extra };
  const keys = Object.keys(cols);
  await conn.query(
    `INSERT INTO leads (${keys.map(k=>`\`${k}\``).join(",")}, consentTimestamp, createdAt) VALUES (${keys.map(()=>"?").join(",")}, NOW(), NOW())`,
    keys.map(k=>cols[k])
  );
}
async function q(sql: string, p: any[] = []) { const [r]:any = await conn.query(sql, p); return r; }
const dump = async (id: string) => (await q(
  "SELECT email_slug, subject_variant AS v, status, DATE_FORMAT(scheduled_at,'%m-%d %H:%i') AS sched, (opened_at IS NOT NULL) AS opened FROM email_queue WHERE lead_id=? ORDER BY id",[id]));
const leadState = async (id: string) => (await q("SELECT sequence_status, (conversion_at IS NOT NULL) AS converted, nudge_sent FROM leads WHERE id=?",[id]))[0];
const show = (label:string,rows:any)=>{ console.log(`\n  ${label}:`); for(const r of rows) console.log("   ",JSON.stringify(r)); };

console.log("\n████ TEST 1 — STOP-ON-CONVERSION (cancelSequenceForLead) ████");
{
  const id = uuid(); await insLead(id);
  const seq = ["email_1_why_match","email_2_cost","email_3_side_effects","email_4_process","email_5_alternatives","email_6_closer"];
  for (const s of seq) await q("INSERT INTO email_queue (lead_id,email_slug,subject_variant,scheduled_at,status) VALUES (?,?,?, '2026-12-01 09:00:00','pending')",[id,s,"A"]);
  show("BEFORE (active sequence — 6 pending)", await dump(id));
  console.log("  lead BEFORE:", JSON.stringify(await leadState(id)));
  console.log("  >>> invoking cancelSequenceForLead()");
  await cancelSequenceForLead(id);
  show("AFTER", await dump(id));
  console.log("  lead AFTER:", JSON.stringify(await leadState(id)));
  await q("UPDATE email_queue SET status='cancelled', error='[test: neutralized]' WHERE lead_id=? AND email_slug='post_conversion' AND status='pending'",[id]);
}

console.log("\n\n████ TEST 2 — STOP-ON-SILENCE (checkStopOnSilence) ████");
{
  const id = uuid(); await insLead(id);
  for (const s of ["email_0_instant","email_1_why_match","email_2_cost"])
    await q("INSERT INTO email_queue (lead_id,email_slug,subject_variant,scheduled_at,status,sent_at,opened_at) VALUES (?,?,?, '2026-06-30 09:00:00','sent', '2026-06-30 09:00:05', NULL)",[id,s,"A"]);
  for (const s of ["email_3_side_effects","email_4_process","email_5_alternatives","email_6_closer"])
    await q("INSERT INTO email_queue (lead_id,email_slug,subject_variant,scheduled_at,status) VALUES (?,?,?, '2026-12-01 09:00:00','pending')",[id,s,"A"]);
  show("BEFORE (0-2 sent+unopened, 3-6 pending)", await dump(id));
  console.log("  >>> invoking checkStopOnSilence()");
  await checkStopOnSilence(id);
  show("AFTER (expect: email_2_cost 'B' retry pending, 3-6 cancelled)", await dump(id));
  await q("UPDATE email_queue SET status='cancelled', error='[test: neutralized]' WHERE lead_id=? AND email_slug='email_2_cost' AND subject_variant='B' AND status='pending'",[id]);
}

console.log("\n\n████ TEST 3 — CLICKED-NO-SALE NUDGE TRIGGER ████");
{
  const id = uuid(); const pub = `test-nudge-${Date.now()}`;
  await insLead(id, { publicId: pub });
  await q("INSERT INTO provider_click_logs (lead_id, public_id, provider_slug, created_at) VALUES (?,?, 'gala', DATE_SUB(NOW(), INTERVAL 4 DAY))",[id,pub]);
  console.log("  seeded provider_click_logs row 4 days old (no conversion, nudge_sent=0)");
  const detected = await q(
    "SELECT DISTINCT l.id, l.`publicId`, pcl.provider_slug, DATE_FORMAT(pcl.created_at,'%Y-%m-%d') AS clicked " +
    "FROM leads l JOIN provider_click_logs pcl ON pcl.lead_id = l.id " +
    "WHERE l.conversion_at IS NULL AND l.nudge_sent = 0 AND l.email NOT LIKE 'anonymous+%' " +
    "AND (l.suppressed IS NULL OR l.suppressed = 0) AND (l.sequence_status = 'active' OR l.sequence_status IS NULL) " +
    "AND pcl.created_at <= DATE_SUB(NOW(), INTERVAL 3 DAY) " +
    "AND NOT EXISTS (SELECT 1 FROM email_queue eq WHERE eq.lead_id = l.id AND eq.email_slug = 'nudge_still_deciding') " +
    "AND l.id = ? LIMIT 10", [id]);
  console.log("  trigger-detection query (from worker.ts) matched lead:", detected.length === 1 ? "YES ✓" : "NO ✗", JSON.stringify(detected));
  console.log("  >>> invoking enqueueNudge()");
  const enq = await enqueueNudge(id);
  console.log("  enqueueNudge returned:", enq);
  show("AFTER (expect nudge_still_deciding pending)", await dump(id));
  console.log("  lead AFTER:", JSON.stringify(await leadState(id)), "← nudge_sent flag now set");
  await q("UPDATE email_queue SET status='cancelled', error='[test: neutralized]' WHERE lead_id=? AND email_slug='nudge_still_deciding' AND status='pending'",[id]);
  await q("DELETE FROM provider_click_logs WHERE lead_id=?",[id]);
}

console.log("\n\n████ RENDER CHECK — email 6 price + preheader ████");
{
  const p: EmailPersonalization = { leadId:"x", publicId:"y", providerName:"Gala Health", matchScore:92, priceFrom:"$179",
    shipDays:4, answerEcho:"", whyRow1:"",whyRow2:"",whyRow3:"", resultsUrl:"https://x/r", goUrl:"https://x/g",
    alt1Name:"",alt1Differentiator:"",alt2Name:"",alt2Differentiator:"", promoCode:null, complianceNote:"", mailingAddress:"n/a" };
  const html = email6(p,"A").html;
  const priceOnce = (html.match(/\$179\/month/g)||[]).length;
  const doubleSuffix = (html.match(/\/mo\/month/g)||[]).length;
  const preFirst = /<body>\s*<div style="display:none/.test(html);
  console.log("  '$179/month' occurrences:", priceOnce, priceOnce===1?"✓ exactly once":"✗");
  console.log("  '/mo/month' double-suffix:", doubleSuffix, doubleSuffix===0?"✓ none":"✗");
  console.log("  price sentence:", (html.match(/The answer hasn't changed:[\s\S]*?<\/p>/)||[])[0]?.replace(/<\/?[^>]+>/g,"").trim());
  console.log("  preheader is FIRST element in <body>:", preFirst?"✓":"✗", "| text:", JSON.stringify(email6(p,"A").preheader));
}

for (const id of created) { await q("DELETE FROM email_queue WHERE lead_id=?",[id]); await q("DELETE FROM leads WHERE id=?",[id]); }
console.log(`\n[cleanup] removed ${created.length} test leads + queue rows + click logs.`);
await conn.end();
