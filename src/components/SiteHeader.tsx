import Image from "next/image";
import Link from "next/link";

import { AuthStatus } from "./AuthStatus";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
import { MobileHeaderVisibility } from "./MobileHeaderVisibility";
import { NotificationBell } from "./NotificationBell";
import { SiteSearch } from "./SiteSearch";
import styles from "./SiteHeader.module.css";

export function SiteHeader({ frontendOnly = false }: Readonly<{ frontendOnly?: boolean }>) {
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

        <NotificationBell className={`${styles.mobileAction} ${styles.notificationAction}`} frontendOnly={frontendOnly} />

        <div className={styles.desktopTools}>
          <SiteSearch className={styles.desktopSearch} inputId="desktop-site-search" />
          <AuthStatus frontendOnly={frontendOnly} />
        </div>
      </div>
    </MobileHeaderVisibility>
  );
}
