"use client";

import { useRouter } from "next/navigation";
import { UserAvatar } from "./UserAvatar";
import styles from "./Notifications.module.css";

type Props = Readonly<{ actorImage: string | null; actorName: string; createdLabel: string; href: string; id: string; message: string; unread: boolean }>;
export function NotificationEntryLink({ actorImage, actorName, createdLabel, href, id, message, unread }: Props) {
  const router = useRouter();
  return <button className={`${styles.entry} ${unread ? styles.unread : ""}`} type="button" onClick={async () => { if (unread) { await fetch(`/api/notifications/${id}/read`, { method: "POST" }); window.dispatchEvent(new Event("dokkaebi-notifications-changed")); } router.push(href); router.refresh(); }}>
    <UserAvatar image={actorImage} name={actorName} size="small" />
    <span><strong>{message}</strong><small>{createdLabel}</small></span>
    {unread ? <b aria-label="읽지 않음">NEW</b> : null}
  </button>;
}
