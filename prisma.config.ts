import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL?.trim();
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim();

if (Boolean(databaseUrl) !== Boolean(shadowDatabaseUrl)) {
  throw new Error(
    "DATABASE_URL and SHADOW_DATABASE_URL must be configured together for migrations.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl && shadowDatabaseUrl
    ? {
        datasource: {
          url: databaseUrl,
          shadowDatabaseUrl,
        },
      }
    : {}),
});
