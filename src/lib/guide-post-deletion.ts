import "server-only";

import { prisma } from "@/lib/prisma";
import { deleteManagedPostAsset, parseManagedPostAsset, type ManagedPostAsset } from "@/lib/cloudinary-post";

type JsonNode = { attrs?: unknown; content?: unknown };

export function collectManagedPostAssets(body: unknown) {
  const assets = new Map<string, ManagedPostAsset>();
  function visit(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const node = value as JsonNode;
    const attrs = node.attrs && typeof node.attrs === "object" && !Array.isArray(node.attrs)
      ? node.attrs as Record<string, unknown>
      : null;
    const asset = parseManagedPostAsset(attrs?.src);
    if (asset) assets.set(asset.url, asset);
    if (Array.isArray(node.content)) node.content.forEach(visit);
  }
  visit(body);
  return [...assets.values()];
}

export async function deleteGuidePost(id: string, resolvedById?: string) {
  const body = await prisma.$transaction(async (tx) => {
    const post = await tx.guidePost.findUnique({ where: { id }, select: { body: true } });
    if (!post) return null;

    const resolution = resolvedById
      ? "관리자가 신고 대상 게시글을 삭제하여 자동 처리되었습니다."
      : "작성자가 게시글을 삭제하여 자동 처리되었습니다.";
    await tx.guideReport.updateMany({
      where: { OR: [{ postId: id }, { comment: { postId: id } }] },
      data: {
        commentId: null,
        postId: null,
        status: "RESOLVED",
        resolution,
        resolvedAt: new Date(),
        resolvedById: resolvedById ?? null,
      },
    });
    await tx.guidePost.delete({ where: { id } });
    return post.body;
  });

  if (!body) return false;

  const assets = collectManagedPostAssets(body);
  const cleanupResults = await Promise.allSettled(assets.map(async (asset) => {
    const rows = await prisma.$queryRaw<Array<{ referenced: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM "GuidePost" WHERE POSITION(${asset.url} IN "body"::text) > 0
      ) AS "referenced"
    `;
    if (!rows[0]?.referenced) await deleteManagedPostAsset(asset);
  }));
  const failed = cleanupResults.filter((result) => result.status === "rejected").length;
  if (failed > 0) console.warn("Deleted guide post asset cleanup incomplete.", { failed, total: assets.length });
  return true;
}
