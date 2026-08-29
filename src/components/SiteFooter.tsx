import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <aside className={styles.adSlot} aria-label="하단 배너 광고 영역">
          <span>광고 배너 영역</span>
          <p>광고 플랫폼을 검토한 뒤 이 위치에 배너가 표시될 수 있습니다.</p>
        </aside>

        <div className={styles.information}>
          <strong>도깨비의 세계 WIKI</strong>
          <p>
            본 사이트는 팬이 운영하는 비공식 정보 사이트이며, 카카오게임즈·슈퍼캣의
            공식 서비스가 아닙니다.
          </p>
          <p>
            ‘도깨비의세계’ 명칭, 상표 및 게임 관련 자료의 권리는 카카오게임즈·슈퍼캣 등
            각 권리자에게 있습니다.
          </p>
          <div className={styles.policyArea}>문의·정책 안내는 관련 문서 준비 후 제공합니다.</div>
          <small>© 2026 DokkaebiProject. 사이트 자체 제작 문서에 한함.</small>
        </div>
      </div>
    </footer>
  );
}
