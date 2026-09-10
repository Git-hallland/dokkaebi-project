import { revalidateTag } from "next/cache";

export const COMMUNITY_CONTENT_CACHE_TAG = "public-community-content";
export const EDITORIAL_CONTENT_CACHE_TAG = "public-editorial-content";

export function revalidateCommunityContent() {
  revalidateTag(COMMUNITY_CONTENT_CACHE_TAG, { expire: 0 });
}

export function revalidateEditorialContent() {
  revalidateTag(EDITORIAL_CONTENT_CACHE_TAG, { expire: 0 });
}
