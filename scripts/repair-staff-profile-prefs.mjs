/**
 * Repair: Drizzle may list migration 0034 as applied while `staff_profile_prefs`
 * is missing (branch restore, failed apply, etc.). Safe to re-run (IF NOT EXISTS).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(
  __dirname,
  "..",
  "src",
  "server",
  "db",
  "migrations",
  "0034_staff_profile_prefs.sql",
);
let ddl = readFileSync(sqlPath, "utf8").trim();
if (!ddl.toUpperCase().includes("IF NOT EXISTS")) {
  ddl = ddl.replace(/^CREATE TABLE\s+"/i, 'CREATE TABLE IF NOT EXISTS "');
}

const pool = new Pool({ connectionString: url });
try {
  await pool.query(ddl);
  console.log("staff_profile_prefs: ensured");
} finally {
  await pool.end();
}
