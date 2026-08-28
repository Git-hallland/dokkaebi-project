import Image from "next/image";
import Link from "next/link";

import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="도깨비의 세계 WIKI 홈">
          <Image
            className={styles.wordmark}
            src="/brand/dokkaebi-world-wiki-logo.png"
            alt="도깨비의 세계 WIKI"
            width={2172}
            height={724}
            priority
          />
        </Link>

        <div className={styles.search} role="search" aria-label="헤더 전체 검색">
          <label className="sr-only" htmlFor="site-search">
            위키 전체 검색
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="전체 문서 검색"
            aria-describedby="site-search-status"
          />
          <button type="button" disabled>
            검색
          </button>
          <span id="site-search-status" className="sr-only">
            검색 기능을 준비하고 있습니다.
          </span>
        </div>
      </div>
    </header>
  );
}
