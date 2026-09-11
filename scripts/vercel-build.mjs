import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const TARGET_MIGRATION = "20260911090000_add_user_sanctions";
const migrationPath = new URL(`../prisma/migrations/${TARGET_MIGRATION}/migration.sql`, import.meta.url);
const connectionString = process.env.APP_DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("APP_DATABASE_URL is not configured for the Vercel build.");
}

let hostname;

try {
  hostname = new URL(connectionString).hostname;
} catch {
  throw new Error("Migration blocked: APP_DATABASE_URL is not a valid URL.");
}

if (!hostname.endsWith(".prisma.io") || hostname.endsWith(".postgres.database.azure.com")) {
  throw new Error(`Migration blocked: expected Prisma Postgres, received provider host ${hostname}.`);
}

const migrationSql = readFileSync(migrationPath, "utf8");
const destructivePattern = /\b(?:DROP|TRUNCATE)\b|^\s*DELETE\s+FROM\b|ALTER\s+TABLE[\s\S]*?\bDROP\b/imu;

if (destructivePattern.test(migrationSql)) {
  throw new Error(`Migration blocked: ${TARGET_MIGRATION} contains a destructive operation.`);
}

console.log(`Database provider verified: ${hostname}`);
console.log(`Migration safety verified: ${TARGET_MIGRATION}`);

const command = process.platform === "win32" ? "npx.cmd" : "npx";

for (const args of [
  ["prisma", "migrate", "deploy", "--config", "prisma.deploy.config.ts"],
  ["next", "build"],
]) {
  const result = spawnSync(command, args, { env: process.env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
