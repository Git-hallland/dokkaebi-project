"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./NotificationBell.module.css";

type Props = Readonly<{ className?: string; frontendOnly?: boolean }>;

function BellIcon({ count }: Readonly<{ count: number }>) {
  return <><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M6.5 9a5.5 5.5 0 0 1 11 0v4l2 3H4.5l2-3ZM10 19h4" /></svg>{count ? <span className={styles.badge}>{count > 99 ? "99+" : count}</span> : null}</>;
}

function LiveNotificationBell({ className = "" }: Props) {
  const { data: session, isPending } = authClient.useSession(); const [count, setCount] = useState(0);
  useEffect(() => { if (!session) return; let active = true; const refresh = () => { void fetch("/api/notifications/unread-count").then(async (response) => { if (active && response.ok) setCount(((await response.json()) as { count: number }).count); }); }; refresh(); window.addEventListener("dokkaebi-notifications-changed", refresh); return () => { active = false; window.removeEventListener("dokkaebi-notifications-changed", refresh); }; }, [session]);
  const icon = <BellIcon count={count} />;
  if (isPending || !session) return <button className={`${styles.bell} ${className}`} type="button" aria-label="알림" disabled>{icon}</button>;
  return <Link className={`${styles.bell} ${className}`} href="/notifications" aria-label={count ? `읽지 않은 알림 ${count}개` : "알림"}>{icon}</Link>;
}

export function NotificationBell({ className = "", frontendOnly = false }: Props) {
  if (frontendOnly) {
    return <Link className={`${styles.bell} ${className}`} href="/notifications" aria-label="알림"><BellIcon count={0} /></Link>;
  }
  return <LiveNotificationBell className={className} />;
}
