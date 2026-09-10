import styles from "./loading.module.css";

export default function RouteLoading() {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.indicator} aria-hidden="true" />
      <div>
        <strong>페이지를 불러오는 중입니다.</strong>
        <p>잠시만 기다려 주세요.</p>
      </div>
    </div>
  );
}
