import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { SiteSearch } from "@/components/SiteSearch";
import { getPopularGuidePosts } from "@/lib/community-data";
import { getRecentPublishedEntities } from "@/lib/editorial-content";
import { isFrontendOnly } from "@/lib/runtime-mode";
import { getPopularYouTubeVideos } from "@/lib/youtube-videos";

import { HomePopularTabs } from "./HomePopularTabs";

import styles from "./page.module.css";

const entityTypeLabels = {
  skills: "도술",
  items: "아이템",
  monsters: "몬스터",
  regions: "지역 / NPC",
} as const;

export default async function Home() {
  await connection();
  const frontendOnly = isFrontendOnly();
  const [popularVideos, popularGuidePosts, recentEntities] = await Promise.all([
    getPopularYouTubeVideos(),
    getPopularGuidePosts(),
    getRecentPublishedEntities(),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>비공식 팬 위키</p>
          <h1 id="home-title">도깨비의 세계 WIKI</h1>
          <p className={styles.heroDescription}>
            공식 발표와 확인 가능한 근거를 바탕으로 게임 정보를 정리합니다.
          </p>
        </div>

        <div className={styles.mobileSearch}>
          <SiteSearch inputId="mobile-site-search" />
        </div>
      </section>

      <HomePopularTabs
        frontendOnly={frontendOnly}
        popularGuidePosts={popularGuidePosts}
        popularVideos={popularVideos}
      />

      <section className={`${styles.panel} ${styles.recentPanel}`} aria-labelledby="recent-title">
        <div className={styles.panelHeading}>
          <div>
            <p className={styles.sectionLabel}>새로 정리된 정보</p>
            <h2 id="recent-title">최근 업데이트</h2>
          </div>
          <p>관리자가 최근 추가하거나 수정한 도감 항목입니다.</p>
        </div>
        {recentEntities.length > 0 ? (
          <ul className={styles.recentGrid}>
            {recentEntities.map((content) => {
              const type = content.type as keyof typeof entityTypeLabels;
              const imageUrl = content.iconImageUrl ?? content.coverImageUrl;
              return (
                <li key={content.id}>
                  <Link href={`/${type}/${encodeURIComponent(content.slug ?? "")}`}>
                    {imageUrl ? (
                      <Image src={imageUrl} alt="" width={88} height={88} unoptimized />
                    ) : (
                      <span className={styles.recentPlaceholder} aria-hidden="true">
                        {content.title.trim().slice(0, 1) || "?"}
                      </span>
                    )}
                    <span className={styles.recentCopy}>
                      <small>{entityTypeLabels[type]}</small>
                      <strong>{content.title}</strong>
                      <time dateTime={content.updatedAt}>
                        {new Date(content.updatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </time>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.emptyState} role="status">
            <strong>최근 공개된 도감 항목이 없습니다.</strong>
            <p>검수를 마친 정보가 공개되면 이곳에서 바로 확인할 수 있습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
