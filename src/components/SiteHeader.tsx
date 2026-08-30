import Image from "next/image";
import Link from "next/link";

import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { MobileHeaderVisibility } from "./MobileHeaderVisibility";
import { SiteSearch } from "./SiteSearch";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <MobileHeaderVisibility
      className={styles.header}
      hiddenClassName={styles.headerHidden}
    >
      <div className={styles.inner}>
        <MobileMenuDrawer
          triggerClassName={`${styles.mobileAction} ${styles.menuAction}`}
        />

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

        <div className={styles.desktopTools}>
          <SiteSearch className={styles.desktopSearch} inputId="desktop-site-search" />
        </div>
      </div>
    </MobileHeaderVisibility>
  );
}
