import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isFrontendOnly } from "@/lib/runtime-mode";

export const SUPPORTER_CACHE_TAG = "visible-supporters";

const readVisibleSupporters = unstable_cache(
  async () => prisma.supporter.findMany({
    where: { isVisible: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      user: { select: { image: true, name: true } },
    },
  }),
  ["visible-supporters-v1"],
  { revalidate: 300, tags: [SUPPORTER_CACHE_TAG] },
);

export async function getVisibleSupporters() {
  if (isFrontendOnly()) return [];
  try {
    return await readVisibleSupporters();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    console.error("Visible supporters unavailable", { code });
    return [];
  }
}
