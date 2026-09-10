import { defineConfig } from "prisma/config";

const url = process.env.APP_DATABASE_URL?.trim();

if (!url) {
  throw new Error("APP_DATABASE_URL is required for deployment migrations.");
}

export default defineConfig({
  datasource: { url },
  migrations: { path: "prisma/migrations" },
  schema: "prisma/schema.prisma",
});
