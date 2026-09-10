const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
export const YOUTUBE_REVALIDATE_SECONDS = 60 * 60 * 2;
export const YOUTUBE_SEARCH_QUERY = "도깨비의 세계 게임";
export const YOUTUBE_RECENT_DAYS = 14;
export const YOUTUBE_EXPANDED_DAYS = 90;
export const YOUTUBE_RESULT_LIMIT = 10;
export const YOUTUBE_MAX_PER_CHANNEL = 2;

// Verified from the canonical URL on the official channel page on 2026-09-10:
// https://www.youtube.com/@dokkaebi.saegye/about
export const OFFICIAL_YOUTUBE_CHANNEL_IDS = new Set(["UCo6HhzSfiIO_4BKGQ4_BY0g"]);
const YOUTUBE_GAME_CONTEXT_TERMS = [
  "게임",
  "mmorpg",
  "신작",
  "출시",
  "오픈",
  "쇼케이스",
  "플레이",
  "공략",
  "리뷰",
  "전투",
  "스킬",
  "도술",
  "직업",
  "kakaogames",
  "supercat",
  "슈퍼캣",
];

export type PopularYouTubeVideo = Readonly<{
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  title: string;
  videoId: string;
  viewCount: number;
}>;

type YouTubeVideoItem = Readonly<{
  id?: unknown;
  snippet?: {
    categoryId?: unknown;
    channelId?: unknown;
    channelTitle?: unknown;
    description?: unknown;
    publishedAt?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
    };
    title?: unknown;
  };
  statistics?: { viewCount?: unknown };
}>;

async function getYouTubeErrorReason(response: Response) {
  try {
    const payload = await response.json() as {
      error?: { errors?: Array<{ reason?: unknown }> };
    };
    const reason = payload.error?.errors?.[0]?.reason;
    return typeof reason === "string" ? reason : "unknown";
  } catch {
    return "unknown";
  }
}

function normalizeYouTubeApiKey(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  const quoted = trimmed.match(/^(["'])(.*)\1$/u);
  return (quoted?.[2] ?? trimmed).trim();
}

function hasGoogleApiKeyShape(value: string) {
  return /^AIza[A-Za-z0-9_-]{35}$/u.test(value);
}

function getTrustedThumbnailUrl(item: YouTubeVideoItem) {
  const candidate = item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url;

  if (typeof candidate !== "string") return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "i.ytimg.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isRelevant(item: YouTubeVideoItem) {
  const haystack = `${item.snippet?.title ?? ""} ${item.snippet?.description ?? ""}`
    .normalize("NFKC")
    .replace(/\s+/gu, "")
    .toLocaleLowerCase("ko-KR");
  return haystack.includes("도깨비의세계") && YOUTUBE_GAME_CONTEXT_TERMS.some((term) => haystack.includes(term));
}

function decodeYouTubeText(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' };
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|apos|gt|lt|quot));/giu, (_match, decimal, hex, entity) => {
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return named[String(entity).toLocaleLowerCase("en-US")] ?? _match;
  });
}

export function parseYouTubeVideoItems(input: unknown): PopularYouTubeVideo[] {
  if (!Array.isArray(input)) return [];

  return input
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object") return [];

      const item = candidate as YouTubeVideoItem;
      const videoId = item.id;
      const categoryId = item.snippet?.categoryId;
      const channelId = item.snippet?.channelId;
      const title = item.snippet?.title;
      const channelTitle = item.snippet?.channelTitle;
      const publishedAt = item.snippet?.publishedAt;
      const thumbnailUrl = getTrustedThumbnailUrl(item);
      const parsedViewCount = typeof item.statistics?.viewCount === "string"
        ? Number.parseInt(item.statistics.viewCount, 10)
        : Number.NaN;

      if (
        typeof videoId !== "string" ||
        categoryId !== "20" ||
        typeof channelId !== "string" ||
        typeof title !== "string" ||
        typeof channelTitle !== "string" ||
        typeof publishedAt !== "string" ||
        !thumbnailUrl ||
        !Number.isSafeInteger(parsedViewCount) ||
        OFFICIAL_YOUTUBE_CHANNEL_IDS.has(channelId) ||
        !isRelevant(item)
      ) return [];

      return [{
        channelId,
        channelTitle: decodeYouTubeText(channelTitle),
        publishedAt,
        thumbnailUrl,
        title: decodeYouTubeText(title),
        videoId,
        viewCount: parsedViewCount,
      }];
    })
    .sort((a, b) => b.viewCount - a.viewCount || b.publishedAt.localeCompare(a.publishedAt));
}

export function selectDiverseYouTubeVideos(
  videos: readonly PopularYouTubeVideo[],
  limit = YOUTUBE_RESULT_LIMIT,
) {
  const perChannel = new Map<string, number>();
  const selected: PopularYouTubeVideo[] = [];

  for (const video of videos) {
    if (selected.length >= limit) break;
    const count = perChannel.get(video.channelId) ?? 0;
    if (count >= YOUTUBE_MAX_PER_CHANNEL) continue;
    perChannel.set(video.channelId, count + 1);
    selected.push(video);
  }

  return selected;
}

export function formatYouTubeViewCount(value: number) {
  if (value >= 10_000) {
    const tenThousands = value / 10_000;
    const display = tenThousands >= 100 ? Math.floor(tenThousands) : Math.floor(tenThousands * 10) / 10;
    return `${display.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만회`;
  }
  if (value >= 1_000) {
    return `${(Math.floor((value / 1_000) * 10) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}천회`;
  }
  return `${value.toLocaleString("ko-KR")}회`;
}

function getPublishedAfter(days: number) {
  const bucketMilliseconds = YOUTUBE_REVALIDATE_SECONDS * 1_000;
  const currentBucket = Math.floor(Date.now() / bucketMilliseconds) * bucketMilliseconds;
  return new Date(currentBucket - days * 24 * 60 * 60 * 1_000).toISOString();
}

async function searchYouTubeVideoIds(apiKey: string, days: number): Promise<string[] | null> {
  const searchParams = new URLSearchParams({
    fields: "items(id/videoId)",
    key: apiKey,
    maxResults: "25",
    order: "viewCount",
    part: "snippet",
    publishedAfter: getPublishedAfter(days),
    q: YOUTUBE_SEARCH_QUERY,
    regionCode: "KR",
    relevanceLanguage: "ko",
    type: "video",
  });
  const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${searchParams}`, {
    next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    console.warn("YouTube search unavailable", {
      keyFormatValid: hasGoogleApiKeyShape(apiKey),
      reason: await getYouTubeErrorReason(response),
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json()) as { items?: Array<{ id?: { videoId?: unknown } }> };
  return (payload.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => typeof id === "string")
    .slice(0, 25);
}

async function loadYouTubeVideoDetails(apiKey: string, ids: readonly string[]) {
  if (ids.length === 0) return [];

  const videoParams = new URLSearchParams({
    fields: "items(id,snippet/title,snippet/description,snippet/categoryId,snippet/channelId,snippet/channelTitle,snippet/publishedAt,snippet/thumbnails/medium/url,snippet/thumbnails/high/url,statistics/viewCount)",
    id: ids.join(","),
    key: apiKey,
    part: "snippet,statistics",
  });
  const response = await fetch(`${YOUTUBE_VIDEOS_ENDPOINT}?${videoParams}`, {
    next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) {
    console.warn("YouTube video details unavailable", {
      reason: await getYouTubeErrorReason(response),
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json()) as { items?: unknown };
  return parseYouTubeVideoItems(payload.items);
}

export async function getPopularYouTubeVideos(): Promise<PopularYouTubeVideo[]> {
  const apiKey = normalizeYouTubeApiKey(process.env.YOUTUBE_API_KEY);
  if (!apiKey) return [];

  try {
    const recentIds = await searchYouTubeVideoIds(apiKey, YOUTUBE_RECENT_DAYS);
    if (recentIds === null) return [];

    const recentVideos = await loadYouTubeVideoDetails(apiKey, recentIds);
    if (recentVideos === null) return [];

    const recentSelection = selectDiverseYouTubeVideos(recentVideos);
    if (recentSelection.length >= 8) return recentSelection;

    const expandedIds = await searchYouTubeVideoIds(apiKey, YOUTUBE_EXPANDED_DAYS);
    if (expandedIds === null) return recentSelection;

    const recentIdSet = new Set(recentIds);
    const newExpandedIds = expandedIds.filter((id) => !recentIdSet.has(id));
    const expandedVideos = await loadYouTubeVideoDetails(apiKey, newExpandedIds);
    if (expandedVideos === null) return recentSelection;

    return selectDiverseYouTubeVideos([...recentVideos, ...expandedVideos]);
  } catch (error) {
    console.warn("YouTube popular videos unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return [];
  }
}
