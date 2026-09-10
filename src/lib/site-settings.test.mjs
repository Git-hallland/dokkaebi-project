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

test("routes enforce settings authorization at UI, direct route, and API boundaries", async () => {
  const [api, writePage, writeAction, profile] = await Promise.all([
    readFile(new URL("../app/api/community/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/community/write/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/community/CommunityWriteAction.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/ProfilePageClient.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(api, /canCreateGuide\(session\.user\.role, siteSettings\.guideWriteEnabled\)/u);
  assert.match(api, /GUIDE_WRITING_DISABLED[\s\S]*status: 403/u);
  assert.match(writePage, /canCreateGuide\(session\.user\.role, siteSettings\.guideWriteEnabled\)[\s\S]*forbidden\(\)/u);
  assert.match(writeAction, /guideWriteEnabled \|\| session\?\.user\.role === "ADMIN"/u);
  assert.match(writeAction, /writeDisabled[\s\S]*aria-disabled="true"/u);
  assert.match(profile, /guideWriteEnabled \|\| session\.user\.role === "ADMIN"/u);
});

test("each ad toggle independently gates its own placeholder", async () => {
  const [layout, footer] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /rightAdEnabled \? <DesktopAdRail/u);
  assert.match(layout, /adEnabled=\{siteSettings\.footerAdEnabled\}/u);
  assert.match(layout, /footerStickyAdEnabled \? <FloatingAdSlot/u);
  assert.match(footer, /adEnabled \? \([\s\S]*하단 배너 광고 영역/u);
});

test("settings writes invalidate the shared cache and refresh the preserved layout", async () => {
  const [cache, form] = await Promise.all([
    readFile(new URL("./site-settings-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteSettingsForm.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(cache, /revalidateTag\(SITE_SETTINGS_CACHE_TAG, \{ expire: 0 \}\)/u);
  assert.match(cache, /revalidatePath\("\/", "layout"\)/u);
  assert.match(cache, /\{ revalidate: 300, tags: \[SITE_SETTINGS_CACHE_TAG\] \}/u);
  assert.match(form, /router\.refresh\(\)/u);
});

test("admin API remains protected and the migration is non-destructive", async () => {
  const [adminApi, migration] = await Promise.all([
    readFile(new URL("../app/api/admin/site-settings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../../prisma/migrations/20260910013000_add_site_settings/migration.sql", import.meta.url), "utf8"),
  ]);
  assert.match(adminApi, /if \(!isCmsAdmin\(session\.user\.role\)\).*403/u);
  assert.doesNotMatch(migration, /DROP|TRUNCATE|DELETE/iu);
});

test("desktop shell and header use the same grid without viewport-specific offsets", async () => {
  const [globals, layoutCss, headerCss, switchCss, sidebar] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteHeader.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/SiteSettingsForm.module.css", import.meta.url), "utf8"),
    readFile(new URL("../components/Sidebar.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(globals, /--site-wide-width:/u);
  assert.match(layoutCss, /width: min\(100%, var\(--site-wide-width\)\)/u);
  assert.match(headerCss, /width: min\(100%, var\(--site-wide-width\)\)/u);
  assert.doesNotMatch(layoutCss, /:has\(|margin:\s*0 auto 0 0/u);
  assert.match(switchCss, /overflow:hidden/u);
  assert.doesNotMatch(switchCss, /translateX/u);
  assert.match(sidebar, />MENU</u);
});
