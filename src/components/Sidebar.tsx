import Link from "next/link";

import styles from "./Sidebar.module.css";

const navigationItems = [
  "홈",
  "초보자 가이드",
  "클래스 / 스킬",
  "아이템 / 장비",
  "몬스터 / 보스",
  "지역 / NPC",
  "던전 / 콘텐츠",
  "제작 / 생활",
  "이벤트 / 쿠폰",
  "패치노트",
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav aria-label="위키 카테고리">
        <p className={styles.title}>정보 탐색</p>
        <ul className={styles.navigation}>
          {navigationItems.map((item, index) => (
            <li key={item}>
              {index === 0 ? (
                <Link href="/" className={styles.current} aria-current="page">
                  {item}
                </Link>
              ) : (
                <span aria-disabled="true" title="콘텐츠 준비 중">
                  {item}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.status}>
        <span>콘텐츠 상태</span>
        <strong>공식 확인 정보 준비 중</strong>
        <p>검수 기준을 충족한 문서만 공개합니다.</p>
      </div>
    </aside>
  );
}
