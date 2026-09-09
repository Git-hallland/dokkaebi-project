import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./cms-event-status.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const lib = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const item = (id, eventStatus, date) => ({ eventStatus, id, publishedAt: new Date(date), updatedAt: new Date(date) });
const contents = [
  item("A", "ONGOING", "2026-09-01"),
  item("B", "ENDED", "2026-09-08"),
  item("C", "ONGOING", "2026-09-05"),
  item("D", "ENDED", "2026-09-06"),
];

test("sorts ongoing before ended and newest within each group", () => {
  assert.deepEqual(lib.sortEventContents(contents).map(({ id }) => id), ["C", "A", "B", "D"]);
});

test("keeps status priority when sorting oldest first", () => {
  assert.deepEqual(lib.sortEventContents(contents, "asc").map(({ id }) => id), ["A", "C", "D", "B"]);
});

test("treats legacy null event status as ongoing", () => {
  const legacy = item("legacy", null, "2026-09-10");
  assert.equal(lib.resolveCmsEventStatus(null), "ONGOING");
  assert.deepEqual(lib.sortEventContents([contents[1], legacy]).map(({ id }) => id), ["legacy", "B"]);
});
