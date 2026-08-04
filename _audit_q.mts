// Temporary audit query runner — DELETE at end of audit session.
// Usage: npx tsx _audit_q.mts "SELECT ..." [param1 param2 ...]
import fs from "node:fs";
import mysql from "mysql2/promise";

const url = fs.readFileSync(
  "/private/tmp/claude-501/-Users-bencohen-Documents-Claude-Projects-Tipstr-PeptidePilot/9f26c19b-2965-441d-9420-a34bdf6f8dc9/scratchpad/dburl.txt",
  "utf8",
).trim();

const sql = process.argv[2];
const params = process.argv.slice(3);
if (!sql) {
  console.error("no sql");
  process.exit(1);
}

const conn = await mysql.createConnection(url);
try {
  const [rows] = await conn.execute(sql, params);
  console.log(JSON.stringify(rows, null, 1));
} catch (err: any) {
  console.error("ERR", err.code, err.errno, err.sqlState, err.sqlMessage, err.message);
  process.exitCode = 2;
} finally {
  await conn.end();
}
