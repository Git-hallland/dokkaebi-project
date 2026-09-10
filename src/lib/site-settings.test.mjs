import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("./site-settings.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const settings = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const allEnabled = {
  guideWriteEnabled: true,
  rightAdEnabled: true,
  footerAdEnabled: true,
  footerStickyAdEnabled: true,
};

test("pre-release site settings default to all OFF", () => {
  assert.deepEqual(settings.DEFAULT_SITE_SETTINGS, {
    guideWriteEnabled: false,
    rightAdEnabled: false,
    footerAdEnabled: false,
    footerStickyAdEnabled: false,
  });
});

test("site settings accept only the four Boolean fields", () => {
  assert.deepEqual(settings.normalizeSiteSettingsInput(allEnabled), allEnabled);
  assert.throws(() => settings.normalizeSiteSettingsInput({ ...allEnabled, extra: true }), /허용되지 않은/);
  assert.throws(() => settings.normalizeSiteSettingsInput({ ...allEnabled, rightAdEnabled: "true" }), /Boolean/);
  assert.throws(() => settings.normalizeSiteSettingsInput({ guideWriteEnabled: true }), /허용되지 않은/);
});

test("ADMIN can write while the toggle is OFF and ordinary users cannot", () => {
  assert.equal(settings.canCreateGuide("ADMIN", false), true);
  assert.equal(settings.canCreateGuide("USER", false), false);
  assert.equal(settings.canCreateGuide("REVIEWER", false), false);
  assert.equal(settings.canCreateGuide("USER", true), true);
});

test("routes enforce settings authorization and layout gates each ad component", async () => {
  const [api, writePage, layout, adminApi, migration] = await Promise.all([
    readFile(new URL("../app/api/community/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/community/write/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/site-settings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../prisma/migrations/20260910013000_add_site_settings/migration.sql", import.meta.url), "utf8"),
  ]);
  assert.match(api, /GUIDE_WRITING_DISABLED[\s\S]*status: 403/u);
  assert.match(writePage, /canCreateGuide[\s\S]*forbidden\(\)/u);
  assert.match(layout, /rightAdEnabled \? <DesktopAdRail/u);
  assert.match(layout, /footerStickyAdEnabled \? <FloatingAdSlot/u);
  assert.match(adminApi, /if \(!isCmsAdmin\(session\.user\.role\)\).*403/u);
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE/iu);
});
