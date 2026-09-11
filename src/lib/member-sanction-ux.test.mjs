import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("member lists open one lazy-loaded detail dialog without query navigation", async () => {
  const [page, client, detailApi] = await Promise.all([
    source("../app/admin/members/page.tsx"),
    source("../components/MemberManagementClient.tsx"),
    source("../app/api/admin/members/[id]/route.ts"),
  ]);
  assert.match(page, /<MemberManagementClient/u);
  assert.doesNotMatch(page, /params\.member|selectedId/u);
  assert.match(client, /<dialog/u);
  assert.match(client, /showModal\(\)/u);
  assert.match(client, /className=\{styles\.memberRow\}/u);
  assert.match(client, /fetch\(`\/api\/admin\/members\/\$\{encodeURIComponent\(memberId\)\}`/u);
  assert.match(detailApi, /session\.user\.role !== "ADMIN"/u);
  assert.match(detailApi, /sanctions:[\s\S]*take: 100/u);
});

test("post suspension uses the shared notice dialog before write navigation", async () => {
  const [action, accessApi, writePage, postApi] = await Promise.all([
    source("../app/community/CommunityWriteAction.tsx"),
    source("../app/api/community/write-access/route.ts"),
    source("../app/community/write/page.tsx"),
    source("../app/api/community/posts/route.ts"),
  ]);
  assert.match(action, /fetch\("\/api\/community\/write-access"/u);
  assert.match(action, /<SanctionNoticeDialog/u);
  assert.doesNotMatch(action, /href=\{session \? "\/community\/write"/u);
  assert.match(accessApi, /getBlockingSanction\(session\.user\.id, "POST"\)/u);
  assert.match(writePage, /<CommunityWriteBlocked/u);
  assert.match(postApi, /getBlockingSanction\(session\.user\.id, "POST"\)/u);
});

test("sanction mutation routes retain strict admin and protected-account guards", async () => {
  const [createApi, revokeApi] = await Promise.all([
    source("../app/api/admin/members/[id]/sanctions/route.ts"),
    source("../app/api/admin/members/[id]/sanctions/[sanctionId]/route.ts"),
  ]);
  for (const route of [createApi, revokeApi]) assert.match(route, /session\.user\.role !== "ADMIN"/u);
  assert.match(createApi, /targetId === session\.user\.id/u);
  assert.match(createApi, /target\.role === "ADMIN"/u);
  assert.match(revokeApi, /userId === session\.user\.id/u);
  assert.match(revokeApi, /target\.role === "ADMIN"/u);
  assert.match(revokeApi, /revokedAt: new Date\(\), revokedById: session\.user\.id/u);
});
