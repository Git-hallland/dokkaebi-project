import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("DB-backed pages branch before loading auth or Prisma", async () => {
  const routes = [
    "../app/community/page.tsx",
    "../app/community/[id]/page.tsx",
    "../app/community/[id]/edit/page.tsx",
    "../app/community/write/page.tsx",
    "../app/profile/page.tsx",
    "../app/favorites/page.tsx",
    "../app/notifications/page.tsx",
    "../app/admin/page.tsx",
    "../app/admin/reports/[id]/page.tsx",
  ];

  for (const route of routes) {
    const contents = await source(route);
    const previewBranch = contents.indexOf("if (isFrontendOnly())");
    const authLoad = contents.indexOf('import("@/lib/auth")');
    assert.ok(previewBranch >= 0, `${route} must have a preview branch`);
    assert.ok(authLoad > previewBranch, `${route} must load auth after the preview branch`);
  }
});

test("home replaces its GuidePost query with preview data", async () => {
  const contents = await source("../app/page.tsx");
  assert.match(contents, /frontendOnly \? Promise\.resolve\(\[\]\) : prisma\.guidePost\.findMany/u);
});

test("preview clients do not mount live auth or notification hooks", async () => {
  const authStatus = await source("../components/AuthStatus.tsx");
  const bell = await source("../components/NotificationBell.tsx");
  const nav = await source("../components/MobileBottomNav.tsx");
  assert.match(authStatus, /frontendOnly \? <PreviewAuthStatus \/> : <LiveAuthStatus \/>/u);
  assert.match(bell, /if \(frontendOnly\)/u);
  assert.match(nav, /if \(frontendOnly\).*MobileBottomNavContent/u);
});

test("Prisma and auth remain lazy and API traffic has a preview guard", async () => {
  const prisma = await source("./prisma.ts");
  const auth = await source("./auth.ts");
  const proxy = await source("../proxy.ts");
  assert.match(prisma, /prismaInstance \?\?= createPrismaClient\(\)/u);
  assert.match(prisma, /if \(isFrontendOnly\(\)\)/u);
  assert.match(auth, /authInstance \?\?= createAuth\(\)/u);
  assert.match(auth, /if \(isFrontendOnly\(\)\)/u);
  assert.match(proxy, /matcher: "\/api\/:path\*"/u);
  assert.match(proxy, /frontendOnlyApiResponse\(\)/u);
});
