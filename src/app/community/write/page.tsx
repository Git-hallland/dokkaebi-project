import Link from "next/link";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { CommunityPostEditor } from "@/components/CommunityPostEditor";
import { auth } from "@/lib/auth";
import styles from "../community.module.css";

export default async function CommunityWritePage() {
  const session = await headers().then((value) => auth.api.getSession({ headers: value }));
  if (!session) return <div className={styles.empty}><h1>로그인이 필요합니다</h1><p>공략과 팁은 로그인한 사용자만 작성할 수 있습니다.</p><Link className={styles.write} href="/profile">로그인하러 가기</Link></div>;
  const key = createHash("sha256").update(session.user.id).digest("hex").slice(0, 16);
  return <div className={styles.page}><header><p>COMMUNITY</p><h1>새 글 작성</h1></header><CommunityPostEditor storageKey={`dokkaebi-community-draft-${key}`} /></div>;
}
