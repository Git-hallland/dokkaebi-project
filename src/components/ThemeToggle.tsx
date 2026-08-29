"use client";

import { useTheme } from "./ThemeProvider";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      className={`${styles.toggle} ${isLight ? styles.light : styles.dark} ${className ?? ""}`}
      type="button"
      aria-label={isLight ? "다크 모드로 전환" : "라이트 모드로 전환"}
      aria-pressed={isLight}
      onClick={toggleTheme}
    >
      <svg className={styles.sun} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg className={styles.moon} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
        <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
      </svg>
      <span className={styles.thumb} />
    </button>
  );
}
