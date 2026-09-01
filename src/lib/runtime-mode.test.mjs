import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./runtime-mode.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("enables frontend-only mode only for an explicit true value", () => {
  assert.equal(lib.isFrontendOnlyValue("true"), true);
  assert.equal(lib.isFrontendOnlyValue(" TRUE "), false);
  assert.equal(lib.isFrontendOnlyValue("false"), false);
  assert.equal(lib.isFrontendOnlyValue(undefined), false);
});

test("blocks API access only in frontend-only mode", () => {
  assert.equal(lib.shouldBlockFrontendOnlyApi("/api/community/posts", true), true);
  assert.equal(lib.shouldBlockFrontendOnlyApi("/profile", true), false);
  assert.equal(lib.shouldBlockFrontendOnlyApi("/api/community/posts", false), false);
});

test("returns a preview-safe API response without internal details", async () => {
  const response = lib.frontendOnlyApiResponse();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    code: "FRONTEND_ONLY_PREVIEW",
    error: "frontend_only_preview",
    message: "이 기능은 프론트엔드 미리보기 환경에서 사용할 수 없습니다.",
  });
});
