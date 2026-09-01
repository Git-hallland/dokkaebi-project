"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { MobileNavIcon, type MobileNavIconName } from "./MobileNavIcon";
import styles from "./MobileBottomNav.module.css";

type PendingItem = Readonly<{
  label: string;
  icon: MobileNavIconName;
}>;

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
  const { data: session, isPending } = authClient.useSession();
  const isHome = pathname === "/";
  const isGuides = pathname === "/community" || pathname.startsWith("/community/");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const isFavorites = pathname === "/favorites" || pathname.startsWith("/favorites/");

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
            href="/community"
            aria-current={isGuides ? "page" : undefined}
          >
            <ItemContent label="공략게시판" icon="board" />
          </Link>
        </li>
        <li>
          <Link
            className={`${styles.item} ${isFavorites ? styles.current : ""}`}
            href="/favorites"
            aria-current={isFavorites ? "page" : undefined}
          >
            <ItemContent label="즐겨찾기" icon="bookmark" />
          </Link>
        </li>
        <li>
          <Link
            className={`${styles.item} ${isProfile ? styles.current : ""}`}
            href="/profile"
            aria-current={isProfile ? "page" : undefined}
          >
            <ItemContent
              label={isPending ? "계정" : session ? "프로필" : "로그인"}
              icon={session || isPending ? "profile" : "key"}
            />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
