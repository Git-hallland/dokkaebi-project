const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
export const YOUTUBE_REVALIDATE_SECONDS = 60 * 60 * 12;
export const YOUTUBE_SEARCH_QUERY = "도깨비의 세계 게임";

export type PopularYouTubeVideo = Readonly<{
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
  return haystack.includes("도깨비의세계");
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
      const title = item.snippet?.title;
      const channelTitle = item.snippet?.channelTitle;
      const publishedAt = item.snippet?.publishedAt;
      const thumbnailUrl = getTrustedThumbnailUrl(item);
      const parsedViewCount = typeof item.statistics?.viewCount === "string"
        ? Number.parseInt(item.statistics.viewCount, 10)
        : Number.NaN;

      if (
        typeof videoId !== "string" ||
        typeof title !== "string" ||
        typeof channelTitle !== "string" ||
        typeof publishedAt !== "string" ||
        !thumbnailUrl ||
        !Number.isSafeInteger(parsedViewCount) ||
        !isRelevant(item)
      ) return [];

      return [{
        channelTitle: decodeYouTubeText(channelTitle),
        publishedAt,
        thumbnailUrl,
        title: decodeYouTubeText(title),
        videoId,
        viewCount: parsedViewCount,
      }];
    })
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 8);
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

export async function getPopularYouTubeVideos(): Promise<PopularYouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const searchParams = new URLSearchParams({
      fields: "items/id/videoId",
      key: apiKey,
      maxResults: "12",
      order: "viewCount",
      part: "snippet",
      q: YOUTUBE_SEARCH_QUERY,
      regionCode: "KR",
      relevanceLanguage: "ko",
      type: "video",
    });
    const searchResponse = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${searchParams}`, {
      next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(4_000),
    });
    if (!searchResponse.ok) {
      console.warn("YouTube search unavailable", { status: searchResponse.status });
      return [];
    }

    const searchPayload = (await searchResponse.json()) as { items?: Array<{ id?: { videoId?: unknown } }> };
    const ids = (searchPayload.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => typeof id === "string")
      .slice(0, 12);
    if (ids.length === 0) return [];

    const videoParams = new URLSearchParams({
      fields: "items(id,snippet/title,snippet/description,snippet/channelTitle,snippet/publishedAt,snippet/thumbnails/medium/url,snippet/thumbnails/high/url,statistics/viewCount)",
      id: ids.join(","),
      key: apiKey,
      part: "snippet,statistics",
    });
    const videoResponse = await fetch(`${YOUTUBE_VIDEOS_ENDPOINT}?${videoParams}`, {
      next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(4_000),
    });
    if (!videoResponse.ok) {
      console.warn("YouTube video details unavailable", { status: videoResponse.status });
      return [];
    }

    const payload = (await videoResponse.json()) as { items?: unknown };
    return parseYouTubeVideoItems(payload.items);
  } catch (error) {
    console.warn("YouTube popular videos unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return [];
  }
}
