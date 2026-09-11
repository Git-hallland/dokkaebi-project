import Image from "next/image";
import { Suspense } from "react";
import { connection } from "next/server";

import { SiteSearch } from "@/components/SiteSearch";
import { HomeCommunityCards } from "@/components/HomeCommunityCards";
import { getPopularGuidePosts } from "@/lib/community-data";
import { getVisibleSupporters } from "@/lib/supporter-data";
import { isFrontendOnly } from "@/lib/runtime-mode";

import { HomePopularTabs } from "./HomePopularTabs";
import { HomePopularVideos } from "./HomePopularVideos";

import styles from "./page.module.css";

export default async function Home() {
  await connection();
  const frontendOnly = isFrontendOnly();
  const [popularGuidePosts, supporters] = await Promise.all([
    getPopularGuidePosts(),
    getVisibleSupporters(),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>비공식 팬 위키</p>
          <h1 id="home-title"><Image className={styles.heroLogo} src="/brand/dokkaebi-world-wiki-logo.png" alt="도깨비의 세계 WIKI" width={2172} height={724} priority /></h1>
        </div>

        <div className={styles.mobileSearch}>
          <SiteSearch inputId="mobile-site-search" />
        </div>
      </section>

      <HomePopularTabs
        frontendOnly={frontendOnly}
        popularGuidePosts={popularGuidePosts}
        videoPanel={
          <Suspense fallback={<div className={styles.emptyState} role="status">인기 영상을 불러오는 중입니다.</div>}>
            <HomePopularVideos />
          </Suspense>
        }
      />

      <HomeCommunityCards supporters={supporters} />
    </div>
  );
}
