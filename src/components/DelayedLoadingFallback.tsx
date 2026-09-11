"use client";

import { useEffect, useState } from "react";
import styles from "@/app/loading.module.css";

const LOADING_DELAY_MS = 250;

export function DelayedLoadingFallback() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), LOADING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return <div className={styles.delaySpace} aria-hidden="true" />;
  return <div className={styles.loading} role="status" aria-live="polite"><span className={styles.indicator} aria-hidden="true" /><div><strong>페이지를 불러오는 중입니다.</strong><p>잠시만 기다려 주세요.</p></div></div>;
}
