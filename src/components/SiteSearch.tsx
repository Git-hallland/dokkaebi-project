import styles from "./SiteSearch.module.css";

type SiteSearchProps = Readonly<{
  inputId: string;
  className?: string;
}>;

export function SiteSearch({ inputId, className }: SiteSearchProps) {
  const statusId = `${inputId}-status`;

  return (
    <div
      className={`${styles.search} ${className ?? ""}`}
      role="search"
      aria-label="위키 전체 검색"
    >
      <svg
        className={styles.icon}
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <label className="sr-only" htmlFor={inputId}>
        위키 전체 검색
      </label>
      <input
        id={inputId}
        type="search"
        placeholder="검색 기능 준비 중"
        aria-describedby={statusId}
        disabled
      />
      <button type="button" disabled>
        검색
      </button>
      <span id={statusId} className="sr-only">
        검색 기능을 준비하고 있습니다.
      </span>
    </div>
  );
}
