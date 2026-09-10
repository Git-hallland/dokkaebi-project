import { getPopularYouTubeVideos } from "@/lib/youtube-videos";

import { YouTubeVideoCarousel } from "./YouTubeVideoCarousel";
import styles from "./page.module.css";

export async function HomePopularVideos() {
  const videos = await getPopularYouTubeVideos();

  if (videos.length === 0) {
    return (
      <div className={styles.emptyState} role="status">
        <strong>현재 인기 영상을 불러올 수 없습니다.</strong>
        <p>잠시 후 다시 확인해 주세요.</p>
      </div>
    );
  }

  return <YouTubeVideoCarousel videos={videos} />;
}
