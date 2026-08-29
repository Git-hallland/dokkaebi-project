"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNavIcon, type MobileNavIconName } from "./MobileNavIcon";
import styles from "./MobileBottomNav.module.css";

type PendingItem = Readonly<{
  label: string;
  icon: MobileNavIconName;
}>;

const pendingItems: readonly PendingItem[] = [
  { label: "즐겨찾기", icon: "bookmark" },
  { label: "프로필", icon: "profile" },
];

function ItemContent({ label, icon }: PendingItem) {
  return (
    <>
      <MobileNavIcon className={styles.icon} name={icon} />
      <span>{label}</span>
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isGuides = pathname === "/guides" || pathname.startsWith("/guides/");

  return (
    <nav className={styles.nav} aria-label="모바일 주요 탐색">
      <ul className={styles.list}>
        <li>
          <Link
            className={`${styles.item} ${isHome ? styles.current : ""}`}
            href="/"
            aria-current={isHome ? "page" : undefined}
          >
            <ItemContent label="홈" icon="home" />
          </Link>
        </li>
        <li>
          <Link
            className={`${styles.item} ${isGuides ? styles.current : ""}`}
            href="/guides"
            aria-current={isGuides ? "page" : undefined}
          >
            <ItemContent label="공략게시판" icon="board" />
          </Link>
        </li>
        {pendingItems.map((item) => (
          <li key={item.label}>
            <button
              className={styles.item}
              type="button"
              disabled
              title={`${item.label} 기능 준비 중`}
            >
              <ItemContent {...item} />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
