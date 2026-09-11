import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import pg from "pg";

const TARGET_MIGRATION = "20260911010000_add_supporters_and_report_reason";
const migrationsDirectory = path.join(process.cwd(), "prisma", "migrations");

function fail(message) {
  throw new Error(`Production migration gate: ${message}`);
}

if (process.env.VERCEL_ENV !== "production") {
  console.log("Production migration gate: skipped outside Vercel Production.");
  process.exit(0);
}

const connectionString = process.env.APP_DATABASE_URL?.trim();
if (!connectionString) fail("APP_DATABASE_URL is unavailable.");

let hostname;
try {
  hostname = new URL(connectionString).hostname.toLowerCase();
} catch {
  fail("APP_DATABASE_URL is not a valid URL.");
}

if (!hostname.endsWith(".prisma.io") || hostname === "dokkaebi-postgres-dev.postgres.database.azure.com") {
  fail("database provider is not Prisma Postgres.");
}
console.log(`Production migration gate: provider=Prisma Postgres, hostname=${hostname}`);

const migrationSql = await readFile(path.join(migrationsDirectory, TARGET_MIGRATION, "migration.sql"), "utf8");
const destructiveSql = /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu;
if (destructiveSql.test(migrationSql)) fail("target migration contains destructive SQL.");

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  const appliedResult = await client.query(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
  );
  const applied = new Set(appliedResult.rows.map((row) => String(row.migration_name)));
  const migrationNames = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^\d+_/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const pending = migrationNames.filter((name) => !applied.has(name));

  if (pending.length === 0) {
    if (!applied.has(TARGET_MIGRATION)) fail("target migration is neither pending nor applied.");
    console.log(`Production migration gate: ${TARGET_MIGRATION} is already applied.`);
    process.exitCode = 0;
  } else {
    if (pending.length !== 1 || pending[0] !== TARGET_MIGRATION) {
      fail(`expected only ${TARGET_MIGRATION}; found ${pending.length} pending migration(s).`);
    }
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const deployed = spawnSync(command, ["prisma", "migrate", "deploy"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
      stdio: "pipe",
    });
    if (deployed.status !== 0) fail(`prisma migrate deploy failed with exit code ${deployed.status ?? "unknown"}.`);

    const verified = await client.query(
      'SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL LIMIT 1',
      [TARGET_MIGRATION],
    );
    if (verified.rowCount !== 1) fail("target migration could not be verified after deploy.");
    console.log(`Production migration gate: applied and verified ${TARGET_MIGRATION}.`);
  }
} finally {
  await client.end().catch(() => undefined);
}
