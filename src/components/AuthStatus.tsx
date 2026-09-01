"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import styles from "./AuthStatus.module.css";

export function AuthStatus() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className={styles.loading} role="status">
        로그인 확인 중
      </span>
    );
  }

  if (!session) {
    return (
      <Link className={styles.signIn} href="/profile">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <circle cx="8" cy="12" r="4" />
          <path d="m11 9 9-6M16 6l2 2M14 8l2 2" />
        </svg>
        로그인
      </Link>
    );
  }

  const canViewReports = session.user.role === "REVIEWER" || session.user.role === "ADMIN";
  return <><NotificationBell />{canViewReports ? <Link className={styles.admin} href="/admin">신고 관리</Link> : null}<Link className={styles.profile} href="/profile" aria-label={`${session.user.name} 프로필`}><UserAvatar image={session.user.image} name={session.user.name} size="small" /><span className={styles.name}>프로필</span></Link></>;
}
