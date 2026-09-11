import { SupporterRanking, type PublicSupporter } from "./SupporterRanking";

import styles from "./HomeCommunityCards.module.css";

function ChatIcon() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M5 6.5h14v9H9l-4 2.8V6.5Z"/><path d="M8.5 10h7M8.5 13h4.5"/></svg>;
}

function HeartIcon() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M12 19.5 5.2 12.8A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 6.8 6.5L12 19.5Z"/></svg>;
}

export function HomeCommunityCards({ supporters }: Readonly<{ supporters: readonly PublicSupporter[] }>) {
  return (
    <section className={styles.section} aria-labelledby="community-links-title">
      <div className={styles.heading}>
        <p>함께 만드는 위키</p>
        <h2 id="community-links-title">커뮤니티와 후원</h2>
      </div>
      <div className={styles.grid}>
        <a className={styles.card} href="https://open.kakao.com/o/gESeLyBi" target="_blank" rel="noopener noreferrer" aria-label="도깨비의세계 오픈톡방 새 탭에서 열기">
          <span className={`${styles.icon} ${styles.chat}`}><ChatIcon /></span>
          <span><strong>도깨비의세계 오픈톡방</strong><small>유저들과 정보를 공유해보세요</small></span>
        </a>
        <a className={styles.card} href="https://toon.at/donate/hallland" target="_blank" rel="noopener noreferrer" aria-label="관리자에게 후원하기 새 탭에서 열기">
          <span className={`${styles.icon} ${styles.heart}`}><HeartIcon /></span>
          <span><strong>관리자에게 후원하기</strong><small>위키 운영을 응원해주세요</small></span>
        </a>
        <SupporterRanking supporters={supporters} />
      </div>
    </section>
  );
}
