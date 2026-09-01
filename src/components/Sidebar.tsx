"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { boardCategories } from "@/lib/board-categories";

import styles from "./Sidebar.module.css";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <nav aria-label="위키 카테고리">
        <p className={styles.title}>정보 탐색</p>
        <ul className={styles.navigation}>
          <li>
            <Link
              href="/"
              className={pathname === "/" ? styles.current : undefined}
              aria-current={pathname === "/" ? "page" : undefined}
            >
              홈
            </Link>
          </li>
          {boardCategories.map((item) => {
            const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={isCurrent ? styles.current : undefined}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
