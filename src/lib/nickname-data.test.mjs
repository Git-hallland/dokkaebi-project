import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const profileSource = await readFile(new URL("./profile-input.ts", import.meta.url), "utf8");
const profileCompiled = ts.transpileModule(profileSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const profileUrl = `data:text/javascript;base64,${Buffer.from(profileCompiled).toString("base64")}`;
const nicknameSource = (await readFile(new URL("./nickname-data.ts", import.meta.url), "utf8"))
  .replace('import { validateNickname } from "@/lib/profile-input";', `import { validateNickname } from "${profileUrl}";`);
const nicknameCompiled = ts.transpileModule(nicknameSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(nicknameCompiled).toString("base64")}`);

function database({ existing = null, updateError = null } = {}) {
  return { user: { findFirst: async () => existing, update: async (args) => { if (updateError) throw updateError; return { name: args.data.name }; } } };
}

test("checks case-insensitive legacy names and normalized nickname keys", async () => {
  const result = await lib.isNicknameAvailable(database(), "Ｄokkaebi12", { id: "me", role: "USER" });
  assert.equal(result.key, "dokkaebi12");
  assert.equal(result.available, true);
});

test("rejects an existing nickname", async () => {
  await assert.rejects(() => lib.updateNickname(database({ existing: { id: "other" } }), "정현123", { id: "me", role: "USER" }), { code: "NICKNAME_TAKEN" });
});

test("maps a database unique race to a nickname conflict", async () => {
  await assert.rejects(() => lib.updateNickname(database({ updateError: { code: "P2002" } }), "정현123", { id: "me", role: "USER" }), { code: "NICKNAME_TAKEN" });
});

test("nickname migration is nullable, unique, and non-destructive", async () => {
  const [sql, build] = await Promise.all([
    readFile(new URL("../../prisma/migrations/20260910190000_add_user_nickname_key/migration.sql", import.meta.url), "utf8"),
    readFile(new URL("../../scripts/vercel-build.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /ADD COLUMN "nicknameKey" TEXT/u);
  assert.match(sql, /CREATE UNIQUE INDEX "user_nicknameKey_key"/u);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|DELETE)\b/iu);
  assert.match(build, /hostname\.endsWith\("\.prisma\.io"\)/u);
  assert.match(build, /migrate", "deploy"/u);
});
