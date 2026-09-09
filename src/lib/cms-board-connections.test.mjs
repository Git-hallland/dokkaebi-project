import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import ts from "typescript";

const boardsSource = await readFile(new URL("./cms-boards.ts", import.meta.url), "utf8");
const boardsCompiled = ts.transpileModule(boardsSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const boards = await import(`data:text/javascript;base64,${Buffer.from(boardsCompiled).toString("base64")}`);

test("all eight CMS boards have matching list and detail routes", async () => {
  assert.equal(boards.CMS_BOARD_CONFIG.length, 8);
  for (const board of boards.CMS_BOARD_CONFIG) {
    assert.equal(board.href, `/${board.key}`);
    await access(new URL(`../app/${board.key}/page.tsx`, import.meta.url));
    await access(new URL(`../app/${board.key}/[slug]/page.tsx`, import.meta.url));
    const list = await readFile(new URL(`../app/${board.key}/page.tsx`, import.meta.url), "utf8");
    const detail = await readFile(new URL(`../app/${board.key}/[slug]/page.tsx`, import.meta.url), "utf8");
    assert.match(list, new RegExp(`getBoardCategory\\(\\"${board.key}\\"\\)`));
    assert.match(detail, new RegExp(`type=\\"${board.key}\\"`));
  }
});

test("public queries require PUBLISHED status and the exact board and slug", async () => {
  const editorial = await readFile(new URL("./editorial-content.ts", import.meta.url), "utf8");
  assert.match(editorial, /status: "PUBLISHED", type, slug: \{ not: null \}/u);
  assert.match(editorial, /slug, status: "PUBLISHED", type/u);
  assert.match(editorial, /type === "events" \? sortEventContents\(contents\) : contents/u);
  const page = await readFile(new URL("../components/EditorialContentPage.tsx", import.meta.url), "utf8");
  assert.match(page, /decodeCmsRouteSlug\(slug\)/u);
  assert.match(page, /if \(!content\) notFound\(\)/u);
});

test("admin image endpoints enforce ADMIN server-side", async () => {
  for (const action of ["signature", "verify"]) {
    const route = await readFile(new URL(`../app/api/admin/content/images/${action}/route.ts`, import.meta.url), "utf8");
    assert.match(route, /if \(!session\).*401/u);
    assert.match(route, /if \(!isCmsAdmin\(session\.user\.role\)\).*403/u);
  }
});

test("skills and items use entity pages while article boards keep BoardPage", async () => {
  for (const board of ["skills", "items"]) {
    const list = await readFile(new URL(`../app/${board}/page.tsx`, import.meta.url), "utf8");
    const detail = await readFile(new URL(`../app/${board}/[slug]/page.tsx`, import.meta.url), "utf8");
    assert.match(list, /EntityBoardPage/u);
    assert.match(detail, /EntityDetailPage/u);
  }
  for (const board of ["events", "patches"]) {
    const list = await readFile(new URL(`../app/${board}/page.tsx`, import.meta.url), "utf8");
    assert.match(list, /BoardPage/u);
  }
  const entityGrid = await readFile(new URL("../components/EntityCardGrid.tsx", import.meta.url), "utf8");
  assert.match(entityGrid, /content\.iconImageUrl \?/u);
  assert.match(entityGrid, /styles\.placeholder/u);
  assert.match(entityGrid, /filterEntityContents/u);
  const entityPage = await readFile(new URL("../components/EntityBoardPage.tsx", import.meta.url), "utf8");
  assert.match(entityPage, /type === "skills"[\s\S]*CMS_SKILL_CATEGORIES/u);
  assert.equal(boards.getCmsBoard("skills").label, "도술");
});

test("public entity queries include card fields and ordered skill levels", async () => {
  const editorial = await readFile(new URL("./editorial-content.ts", import.meta.url), "utf8");
  assert.match(editorial, /iconImageUrl: true/u);
  assert.match(editorial, /entityCategory: true/u);
  assert.match(editorial, /skillLevels:/u);
  assert.match(editorial, /orderBy: \{ order: "asc"/u);
});

test("entity cards keep their size and switch only between one to four columns", async () => {
  const styles = await readFile(new URL("../components/EntityBoardPage.module.css", import.meta.url), "utf8");
  assert.match(styles, /container-name:entity-catalog/u);
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\)/u);
  for (const columns of [2, 3, 4]) {
    assert.match(styles, new RegExp(`grid-template-columns:repeat\\(${columns},minmax\\(0,1fr\\)\\)`));
  }
  assert.match(styles, /\.badges \{[^}]*flex-wrap:nowrap/u);
});
