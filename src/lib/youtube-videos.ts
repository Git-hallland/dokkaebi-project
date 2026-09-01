const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_REVALIDATE_SECONDS = 60 * 60 * 12;

export type PopularYouTubeVideo = Readonly<{
  channelTitle: string;
  thumbnailUrl: string;
  title: string;
  videoId: string;
}>;

type YouTubeSearchItem = Readonly<{
  id?: { videoId?: unknown };
  snippet?: {
    channelTitle?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
    };
    title?: unknown;
  };
}>;

function getTrustedThumbnailUrl(item: YouTubeSearchItem) {
  const candidate = item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url;

  if (typeof candidate !== "string") {
    return null;
  }

  try {
    const url = new URL(candidate);

    return url.protocol === "https:" && url.hostname === "i.ytimg.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseYouTubeSearchItems(input: unknown): PopularYouTubeVideo[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return [];
    }

    const item = candidate as YouTubeSearchItem;
    const videoId = item.id?.videoId;
    const title = item.snippet?.title;
    const channelTitle = item.snippet?.channelTitle;
    const thumbnailUrl = getTrustedThumbnailUrl(item);

    if (
      typeof videoId !== "string" ||
      typeof title !== "string" ||
      typeof channelTitle !== "string" ||
      !thumbnailUrl
    ) {
      return [];
    }

    return [{ channelTitle, thumbnailUrl, title, videoId }];
  });
}

export async function getPopularYouTubeVideos(): Promise<PopularYouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    fields:
      "items(id/videoId,snippet/title,snippet/channelTitle,snippet/thumbnails/medium/url,snippet/thumbnails/high/url)",
    key: apiKey,
    maxResults: "3",
    order: "viewCount",
    part: "snippet",
    q: "도깨비의세계",
    regionCode: "KR",
    relevanceLanguage: "ko",
    type: "video",
  });

  try {
    const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${params}`, {
      next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { items?: unknown };

    return parseYouTubeSearchItems(payload.items);
  } catch {
    return [];
  }
}
