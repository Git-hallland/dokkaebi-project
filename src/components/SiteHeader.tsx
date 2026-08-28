import Image from "next/image";
import Link from "next/link";

import { MobileHeaderVisibility } from "./MobileHeaderVisibility";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <MobileHeaderVisibility
      className={styles.header}
      hiddenClassName={styles.headerHidden}
    >
      <div className={styles.inner}>
        <button
          className={`${styles.mobileAction} ${styles.menuAction}`}
          type="button"
          aria-label="메뉴 열기"
          title="메뉴 기능 준비 중"
          disabled
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

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

        <button
          className={`${styles.mobileAction} ${styles.notificationAction}`}
          type="button"
          aria-label="알림"
          title="알림 기능 준비 중"
          disabled
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
            <path d="M6.5 9a5.5 5.5 0 0 1 11 0v4l2 3H4.5l2-3ZM10 19h4" />
          </svg>
        </button>

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
    </MobileHeaderVisibility>
  );
}
