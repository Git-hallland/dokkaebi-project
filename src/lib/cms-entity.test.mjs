import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./cms-entity.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const contents = [
  { entityCategory: "강타", summary: "넓은 범위 공격", title: "돌풍 강격" },
  { entityCategory: "재료", summary: "장비 성장 재료", title: "영석" },
  { entityCategory: null, summary: null, title: "분류 대기" },
];

test("keeps every established skill category and adds uncategorized", () => {
  assert.deepEqual(lib.CMS_SKILL_CATEGORIES, ["절명", "척살", "강타", "파멸", "저격", "연타", "기동", "주술", "기만", "제압", "강인", "헌신", "미분류"]);
});

test("filters entities by title, summary, and category", () => {
  assert.deepEqual(lib.filterEntityContents(contents, "돌풍", "전체").map((item) => item.title), ["돌풍 강격"]);
  assert.deepEqual(lib.filterEntityContents(contents, "성장", "전체").map((item) => item.title), ["영석"]);
  assert.deepEqual(lib.filterEntityContents(contents, "강타", "전체").map((item) => item.title), ["돌풍 강격"]);
});

test("combines query and category filters and supports uncategorized content", () => {
  assert.deepEqual(lib.filterEntityContents(contents, "범위", "강타").map((item) => item.title), ["돌풍 강격"]);
  assert.equal(lib.filterEntityContents(contents, "성장", "강타").length, 0);
  assert.deepEqual(lib.filterEntityContents(contents, "분류", "미분류").map((item) => item.title), ["분류 대기"]);
});

test("reads only flat string metadata", () => {
  assert.deepEqual(lib.readSkillLevelMetadata({ 피해량: "145%", 중첩: { 값: 1 }, 대상: 3 }), { 피해량: "145%" });
});
