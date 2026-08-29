"use client";

import { useState } from "react";

import styles from "./FloatingAdSlot.module.css";

export function FloatingAdSlot() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className={styles.container} aria-label="하단 고정 광고 영역">
      <div
        id="floating-ad-content"
        className={`${styles.panel} ${isExpanded ? styles.panelExpanded : styles.panelCollapsed}`}
        aria-hidden={!isExpanded}
      >
        <strong>하단 고정 광고 영역</strong>
        <span>광고 서비스 도입 전 placeholder</span>
      </div>

      <button
        className={styles.toggle}
        type="button"
        aria-label={`고정 광고 ${isExpanded ? "접기" : "펼치기"}`}
        aria-controls="floating-ad-content"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d={isExpanded ? "m6 10 6 6 6-6" : "m6 14 6-6 6 6"} />
        </svg>
        <span aria-hidden="true">광고</span>
      </button>
    </aside>
  );
}
