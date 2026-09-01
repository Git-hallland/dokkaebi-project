import styles from "./DesktopAdRail.module.css";

function AdPlaceholder({ position }: Readonly<{ position: number }>) {
  return (
    <div className={styles.slot} role="region" aria-label={`광고 영역 ${position}`}>
      <span>광고</span>
      <small>배너 영역</small>
    </div>
  );
}

export function DesktopAdRail() {
  return (
    <aside className={styles.rail} aria-label="우측 광고">
      <AdPlaceholder position={1} />
      <AdPlaceholder position={2} />
    </aside>
  );
}
