"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Notifications.module.css";

export function NotificationReadAll({ disabled }: Readonly<{ disabled: boolean }>) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button className={styles.readAll} type="button" disabled={disabled || busy} onClick={async () => { setBusy(true); const response = await fetch("/api/notifications/read-all", { method: "POST" }); setBusy(false); if (response.ok) { window.dispatchEvent(new Event("dokkaebi-notifications-changed")); router.refresh(); } }}>{busy ? "처리 중…" : "모두 읽음"}</button>;
}
