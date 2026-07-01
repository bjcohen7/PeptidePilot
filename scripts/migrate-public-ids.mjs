/**
 * Migration: regenerate publicId for ALL existing leads using fresh nanoids.
 *
 * Usage: node scripts/migrate-public-ids.mjs
 *
 * This script:
 * 1. Reads DATABASE_URL from process.env or .env
 * 2. Fetches all leads
 * 3. Generates new nanoid(12) for each lead
 * 4. Updates each row, one by one (safe for production)
 */
import { createConnection } from "mysql2/promise";
import { nanoid } from "nanoid";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || DATABASE_URL.includes("USER:PASSWORD")) {
  console.error("Set DATABASE_URL in .env to a real MySQL connection string.");
  process.exit(1);
}

// Parse mysql://user:password@host:port/database
const url = new URL(DATABASE_URL);
const config = {
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1).split("?")[0],
};

async function main() {
  const conn = await createConnection(config);
  console.log(`Connected to ${config.database} on ${config.host}`);

  const [rows] = await conn.execute("SELECT id, publicId FROM leads");
  const leads = rows;
  console.log(`Found ${leads.length} leads to migrate`);

  let updated = 0;
  for (const lead of leads) {
    const newPublicId = nanoid(12);
    await conn.execute("UPDATE leads SET publicId = ? WHERE id = ?", [newPublicId, lead.id]);
    updated++;
    if (updated % 100 === 0) console.log(`  ${updated}/${leads.length} updated`);
  }

  console.log(`Done. ${updated} leads updated with fresh nanoid(12) publicIds.`);
  await conn.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
