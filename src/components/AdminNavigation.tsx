import Link from "next/link";

import styles from "@/app/admin/admin.module.css";

type AdminSection = "reports" | "content" | "members" | "supporters";

export function AdminNavigation({ active, isAdmin }: Readonly<{ active: AdminSection; isAdmin: boolean }>) {
  const links: Array<{ href: string; key: AdminSection; label: string; adminOnly?: boolean }> = [
    { href: "/admin", key: "reports", label: "신고 관리" },
    { href: "/admin/content", key: "content", label: "위키 콘텐츠 관리", adminOnly: true },
    { href: "/admin/members", key: "members", label: "회원 관리", adminOnly: true },
    { href: "/admin/supporters", key: "supporters", label: "후원자 관리", adminOnly: true },
  ];
  return <nav className={styles.adminNav} aria-label="관리자 메뉴">{links.filter((link) => isAdmin || !link.adminOnly).map((link) => <Link key={link.key} className={active === link.key ? styles.active : undefined} href={link.href}>{link.label}</Link>)}</nav>;
}
